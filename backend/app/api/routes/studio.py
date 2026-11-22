import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.dependencies import (
    ensure_user_exists,
    get_required_db_session,
    parse_uuid,
    resolve_user_uuid,
)
from app.core.security import get_current_user_id, verify_resource_ownership
from app.db.models import (
    Asset,
    Character,
    CharacterReferenceImage,
    Episode,
    Project,
    Scene,
    Story,
)
from app.schemas.api import (
    CharacterCreate,
    CharacterResponse,
    ProjectCreate,
    ProjectResponse,
    SceneCreate,
    SceneResponse,
    StoryCreate,
    StoryResponse,
)

router = APIRouter(tags=["Studio Resources"])


def _character_to_response(char: Character) -> CharacterResponse:
    ref_url = ""
    if char.reference_images:
        primary = next((ri for ri in char.reference_images if ri.is_primary), char.reference_images[0])
        if primary.asset is not None:
            ref_url = primary.asset.object_key
    return CharacterResponse(
        id=str(char.id),
        owner_id=str(char.user_id),
        name=char.name,
        description=char.description,
        face_and_appearance=char.face_and_appearance,
        hairstyle=char.hairstyle,
        clothing=char.clothing,
        age_appearance=char.age_appearance,
        body_description=char.body_description,
        personality=char.personality,
        reference_image_url=ref_url,
        visual_style=char.visual_style,  # type: ignore[arg-type]
        associated_story_ids=[],
        created_at=char.created_at,
        updated_at=char.updated_at,
    )


async def _sync_character_reference_image(
    session: AsyncSession,
    character: Character,
    user_uuid: uuid.UUID,
    reference_image_url: str,
) -> None:
    cleaned = reference_image_url.strip()
    existing_refs = list(character.reference_images or [])
    for ref in existing_refs:
        await session.delete(ref)
    if not cleaned:
        return

    stmt = select(Asset).where(Asset.object_key == cleaned)
    asset = (await session.execute(stmt)).scalar_one_or_none()
    if asset is None:
        asset = Asset(
            user_id=user_uuid,
            asset_type="character_image",
            storage_provider="external" if cleaned.startswith("http") else "local",
            bucket_name="reelcraft-studio",
            object_key=cleaned,
            mime_type="image/jpeg",
            size_bytes=0,
        )
        session.add(asset)
        await session.flush()

    link = CharacterReferenceImage(
        character_id=character.id,
        asset_id=asset.id,
        is_primary=True,
        pose_label="portrait",
    )
    session.add(link)


@router.post("/api/v1/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_required_db_session),
) -> ProjectResponse:
    user = await ensure_user_exists(session, user_id)
    project = Project(
        user_id=user.id,
        title=payload.title,
        description=payload.description,
        target_style=payload.target_style,
        aspect_ratio=payload.aspect_ratio,
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return ProjectResponse(
        id=str(project.id),
        owner_id=str(project.user_id),
        title=project.title,
        description=project.description,
        target_style=project.target_style,  # type: ignore[arg-type]
        aspect_ratio=project.aspect_ratio,  # type: ignore[arg-type]
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.get("/api/v1/projects", response_model=list[ProjectResponse])
async def list_projects(
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_required_db_session),
) -> list[ProjectResponse]:
    owner_uuid = resolve_user_uuid(user_id)
    stmt = (
        select(Project)
        .where(Project.user_id == owner_uuid)
        .order_by(Project.updated_at.desc())
    )
    rows = (await session.execute(stmt)).scalars().all()
    return [
        ProjectResponse(
            id=str(p.id),
            owner_id=str(p.user_id),
            title=p.title,
            description=p.description,
            target_style=p.target_style,  # type: ignore[arg-type]
            aspect_ratio=p.aspect_ratio,  # type: ignore[arg-type]
            created_at=p.created_at,
            updated_at=p.updated_at,
        )
        for p in rows
    ]


@router.get("/api/v1/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_required_db_session),
) -> ProjectResponse:
    owner_uuid = resolve_user_uuid(user_id)
    project = await session.get(Project, parse_uuid(project_id, "project_id"))
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    verify_resource_ownership(str(project.user_id), str(owner_uuid))
    return ProjectResponse(
        id=str(project.id),
        owner_id=str(project.user_id),
        title=project.title,
        description=project.description,
        target_style=project.target_style,  # type: ignore[arg-type]
        aspect_ratio=project.aspect_ratio,  # type: ignore[arg-type]
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.post("/api/v1/stories", response_model=StoryResponse, status_code=status.HTTP_201_CREATED)
async def create_story(
    payload: StoryCreate,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_required_db_session),
) -> StoryResponse:
    user = await ensure_user_exists(session, user_id)
    project_uuid = parse_uuid(payload.project_id, "project_id") if payload.project_id else None
    if project_uuid is not None:
        project = await session.get(Project, project_uuid)
        if project is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Linked project not found.")
        verify_resource_ownership(str(project.user_id), str(user.id))

    story = Story(
        user_id=user.id,
        project_id=project_uuid,
        title=payload.title,
        description=payload.description,
        visual_style=payload.visual_style,
        default_aspect_ratio=payload.default_aspect_ratio,
    )
    session.add(story)
    await session.commit()
    await session.refresh(story)
    return StoryResponse(
        id=str(story.id),
        owner_id=str(story.user_id),
        title=story.title,
        description=story.description,
        project_id=str(story.project_id) if story.project_id else None,
        visual_style=story.visual_style,  # type: ignore[arg-type]
        default_aspect_ratio=story.default_aspect_ratio,  # type: ignore[arg-type]
        character_ids=payload.character_ids,
        created_at=story.created_at,
        updated_at=story.updated_at,
    )


@router.get("/api/v1/stories", response_model=list[StoryResponse])
async def list_stories(
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_required_db_session),
) -> list[StoryResponse]:
    owner_uuid = resolve_user_uuid(user_id)
    stmt = (
        select(Story)
        .where(Story.user_id == owner_uuid)
        .order_by(Story.updated_at.desc())
    )
    rows = (await session.execute(stmt)).scalars().all()
    return [
        StoryResponse(
            id=str(s.id),
            owner_id=str(s.user_id),
            title=s.title,
            description=s.description,
            project_id=str(s.project_id) if s.project_id else None,
            visual_style=s.visual_style,  # type: ignore[arg-type]
            default_aspect_ratio=s.default_aspect_ratio,  # type: ignore[arg-type]
            character_ids=[],
            created_at=s.created_at,
            updated_at=s.updated_at,
        )
        for s in rows
    ]


@router.get("/api/v1/stories/{story_id}", response_model=StoryResponse)
async def get_story(
    story_id: str,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_required_db_session),
) -> StoryResponse:
    owner_uuid = resolve_user_uuid(user_id)
    story = await session.get(Story, parse_uuid(story_id, "story_id"))
    if story is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found.")
    verify_resource_ownership(str(story.user_id), str(owner_uuid))
    return StoryResponse(
        id=str(story.id),
        owner_id=str(story.user_id),
        title=story.title,
        description=story.description,
        project_id=str(story.project_id) if story.project_id else None,
        visual_style=story.visual_style,  # type: ignore[arg-type]
        default_aspect_ratio=story.default_aspect_ratio,  # type: ignore[arg-type]
        character_ids=[],
        created_at=story.created_at,
        updated_at=story.updated_at,
    )


@router.post("/api/v1/characters", response_model=CharacterResponse, status_code=status.HTTP_201_CREATED)
async def create_character(
    payload: CharacterCreate,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_required_db_session),
) -> CharacterResponse:
    user = await ensure_user_exists(session, user_id)
    char = Character(
        user_id=user.id,
        name=payload.name,
        description=payload.description,
        face_and_appearance=payload.face_and_appearance,
        hairstyle=payload.hairstyle,
        clothing=payload.clothing,
        age_appearance=payload.age_appearance,
        body_description=payload.body_description,
        personality=payload.personality,
        visual_style=payload.visual_style,
    )
    session.add(char)
    await session.flush()
    await _sync_character_reference_image(session, char, user.id, payload.reference_image_url)
    await session.commit()

    stmt = (
        select(Character)
        .options(selectinload(Character.reference_images).selectinload(CharacterReferenceImage.asset))
        .where(Character.id == char.id)
    )
    hydrated = (await session.execute(stmt)).scalar_one()
    return _character_to_response(hydrated)


@router.get("/api/v1/characters", response_model=list[CharacterResponse])
async def list_characters(
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_required_db_session),
) -> list[CharacterResponse]:
    owner_uuid = resolve_user_uuid(user_id)
    stmt = (
        select(Character)
        .options(selectinload(Character.reference_images).selectinload(CharacterReferenceImage.asset))
        .where(Character.user_id == owner_uuid)
        .order_by(Character.updated_at.desc())
    )
    rows = (await session.execute(stmt)).scalars().all()
    return [_character_to_response(c) for c in rows]


@router.put("/api/v1/characters/{character_id}", response_model=CharacterResponse)
async def update_character(
    character_id: str,
    payload: CharacterCreate,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_required_db_session),
) -> CharacterResponse:
    owner_uuid = resolve_user_uuid(user_id)
    stmt = (
        select(Character)
        .options(selectinload(Character.reference_images).selectinload(CharacterReferenceImage.asset))
        .where(Character.id == parse_uuid(character_id, "character_id"))
    )
    char = (await session.execute(stmt)).scalar_one_or_none()
    if char is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Character not found.")
    verify_resource_ownership(str(char.user_id), str(owner_uuid))

    char.name = payload.name
    char.description = payload.description
    char.face_and_appearance = payload.face_and_appearance
    char.hairstyle = payload.hairstyle
    char.clothing = payload.clothing
    char.age_appearance = payload.age_appearance
    char.body_description = payload.body_description
    char.personality = payload.personality
    char.visual_style = payload.visual_style

    await _sync_character_reference_image(session, char, owner_uuid, payload.reference_image_url)
    await session.commit()

    hydrated = (await session.execute(stmt)).scalar_one()
    return _character_to_response(hydrated)


@router.delete("/api/v1/characters/{character_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_character(
    character_id: str,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_required_db_session),
) -> None:
    owner_uuid = resolve_user_uuid(user_id)
    char = await session.get(Character, parse_uuid(character_id, "character_id"))
    if char is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Character not found.")
    verify_resource_ownership(str(char.user_id), str(owner_uuid))
    await session.delete(char)
    await session.commit()


@router.post("/api/v1/scenes", response_model=SceneResponse, status_code=status.HTTP_201_CREATED)
async def create_scene(
    payload: SceneCreate,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_required_db_session),
) -> SceneResponse:
    owner_uuid = resolve_user_uuid(user_id)
    story = await session.get(Story, parse_uuid(payload.story_id, "story_id"))
    if story is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found.")
    verify_resource_ownership(str(story.user_id), str(owner_uuid))

    episode = await session.get(Episode, parse_uuid(payload.episode_id, "episode_id"))
    if episode is None or episode.story_id != story.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Episode not found for the specified story.",
        )

    scene = Scene(
        episode_id=episode.id,
        scene_number=payload.scene_number,
        title=payload.title,
        action_description=payload.action_description,
        camera_and_mood=payload.camera_and_mood,
        compiled_prompt=payload.compiled_prompt,
        negative_prompt=payload.negative_prompt,
        duration_seconds=payload.duration_seconds,
        aspect_ratio=payload.aspect_ratio,
    )
    session.add(scene)
    await session.commit()
    await session.refresh(scene)
    return SceneResponse(
        id=str(scene.id),
        owner_id=str(story.user_id),
        story_id=str(story.id),
        episode_id=str(scene.episode_id),
        scene_number=scene.scene_number,
        title=scene.title,
        action_description=scene.action_description,
        camera_and_mood=scene.camera_and_mood,
        compiled_prompt=scene.compiled_prompt,
        negative_prompt=scene.negative_prompt,
        duration_seconds=scene.duration_seconds,
        aspect_ratio=scene.aspect_ratio,  # type: ignore[arg-type]
        character_ids=payload.character_ids,
        created_at=scene.created_at,
        updated_at=scene.updated_at,
    )


@router.get("/api/v1/scenes", response_model=list[SceneResponse])
async def list_scenes(
    episode_id: str | None = Query(default=None),
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_required_db_session),
) -> list[SceneResponse]:
    owner_uuid = resolve_user_uuid(user_id)
    stmt = (
        select(Scene, Episode, Story)
        .join(Episode, Scene.episode_id == Episode.id)
        .join(Story, Episode.story_id == Story.id)
        .where(Story.user_id == owner_uuid)
        .order_by(Scene.scene_number.asc(), Scene.created_at.desc())
    )
    if episode_id:
        stmt = stmt.where(Scene.episode_id == parse_uuid(episode_id, "episode_id"))

    rows = (await session.execute(stmt)).all()
    return [
        SceneResponse(
            id=str(sc.id),
            owner_id=str(st.user_id),
            story_id=str(st.id),
            episode_id=str(sc.episode_id),
            scene_number=sc.scene_number,
            title=sc.title,
            action_description=sc.action_description,
            camera_and_mood=sc.camera_and_mood,
            compiled_prompt=sc.compiled_prompt,
            negative_prompt=sc.negative_prompt,
            duration_seconds=sc.duration_seconds,
            aspect_ratio=sc.aspect_ratio,  # type: ignore[arg-type]
            character_ids=[],
            created_at=sc.created_at,
            updated_at=sc.updated_at,
        )
        for sc, _ep, st in rows
    ]
