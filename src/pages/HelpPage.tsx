import React, { useState } from 'react';
import { BookOpen, Check, Copy, Cpu, Database, Server, Terminal } from 'lucide-react';

interface CommandBlockProps {
  title: string;
  command: string;
}

const CommandBlock: React.FC<CommandBlockProps> = ({ title, command }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#0B0D12] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] bg-[#12151E]">
        <span className="text-xs font-medium text-[#CBD2DF]">{title}</span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1 text-[11px] text-[#9CA3B2] hover:text-white"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3 text-xs font-mono text-[#E6E9F0] overflow-x-auto leading-relaxed">
        {command}
      </pre>
    </div>
  );
};

export const HelpPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[#F8FAFC]">
          Beginner Setup & Production Guide
        </h1>
        <p className="text-sm text-[#9CA3B2] mt-1">
          Step-by-step instructions to install required tools on Windows, create your PostgreSQL database from scratch, start FastAPI, and connect your Cloud GPU worker.
        </p>
      </div>

      {/* Step 1: Required Software */}
      <section className="rounded-xl border border-white/[0.08] bg-[#12151E] p-5 space-y-4">
        <div className="flex items-center gap-2 text-base font-display font-semibold text-[#F3F5F8]">
          <Terminal className="h-4 w-4 text-[#E59A1A]" />
          <span>1. Install Required Software (Windows PowerShell)</span>
        </div>
        <p className="text-xs text-[#9CA3B2] leading-relaxed">
          Open Windows PowerShell and install Python 3.11+, Node.js 20+ LTS, Docker Desktop, and FFmpeg. You can verify or install them via winget:
        </p>
        <CommandBlock
          title="Install Python, Node.js, Docker Desktop & FFmpeg"
          command={`winget install Python.Python.3.11\nwinget install OpenJS.NodeJS.LTS\nwinget install Docker.DockerDesktop\nwinget install Gyan.FFmpeg`}
        />
      </section>

      {/* Step 2: Start PostgreSQL with Docker */}
      <section className="rounded-xl border border-white/[0.08] bg-[#12151E] p-5 space-y-4">
        <div className="flex items-center gap-2 text-base font-display font-semibold text-[#F3F5F8]">
          <Database className="h-4 w-4 text-[#E59A1A]" />
          <span>2. Create Your PostgreSQL Database From Scratch</span>
        </div>
        <p className="text-xs text-[#9CA3B2] leading-relaxed">
          Start Docker Desktop first. Copy <code className="font-mono text-[#E6E9F0]">backend/.env.example</code> to{' '}
          <code className="font-mono text-[#E6E9F0]">backend/.env</code>, choose your own PostgreSQL password, and run Docker Compose to launch a clean PostgreSQL 16 database:
        </p>
        <CommandBlock
          title="Configure .env and start PostgreSQL"
          command={`Copy-Item backend\\.env.example backend\\.env\n# Edit backend\\.env and set POSTGRES_PASSWORD and DATABASE_URL\ndocker compose up -d postgres`}
        />
      </section>

      {/* Step 3: Start FastAPI & Run Migrations */}
      <section className="rounded-xl border border-white/[0.08] bg-[#12151E] p-5 space-y-4">
        <div className="flex items-center gap-2 text-base font-display font-semibold text-[#F3F5F8]">
          <Server className="h-4 w-4 text-[#E59A1A]" />
          <span>3. Run Migrations & Start FastAPI Backend</span>
        </div>
        <CommandBlock
          title="Create Python virtual environment, migrate 12 tables, and start FastAPI"
          command={`cd backend\npython -m venv .venv\n.\\.venv\\Scripts\\Activate.ps1\npip install -r requirements.txt\nalembic upgrade head\nuvicorn app.main:app --reload --port 8000`}
        />
        <p className="text-xs text-[#8E96A4]">
          Once running, Swagger API docs are available at{' '}
          <code className="font-mono text-[#E6E9F0]">http://localhost:8000/docs</code>.
        </p>
      </section>

      {/* Step 4: Connect Frontend */}
      <section className="rounded-xl border border-white/[0.08] bg-[#12151E] p-5 space-y-4">
        <div className="flex items-center gap-2 text-base font-display font-semibold text-[#F3F5F8]">
          <BookOpen className="h-4 w-4 text-[#E59A1A]" />
          <span>4. Connect Frontend & Verify Health</span>
        </div>
        <CommandBlock
          title="Start Vite frontend (from project root)"
          command={`npm install\n$env:VITE_API_BASE_URL="http://localhost:8000"\nnpm run dev`}
        />
        <p className="text-xs text-[#9CA3B2] leading-relaxed">
          You can also paste <code className="font-mono text-[#E6E9F0]">http://localhost:8000</code> inside{' '}
          <strong>Settings → Backend Connection</strong> and click <strong>Save & Test Health</strong>. When your server responds, the banner changes to{' '}
          <span className="text-emerald-400 font-medium">Backend Connected</span>.
        </p>
      </section>

      {/* Step 5: Connect Cloud GPU & AI Video Model */}
      <section className="rounded-xl border border-white/[0.08] bg-[#12151E] p-5 space-y-3">
        <div className="flex items-center gap-2 text-base font-display font-semibold text-[#F3F5F8]">
          <Cpu className="h-4 w-4 text-[#E59A1A]" />
          <span>5. Connecting Your Cloud GPU & AI Model Later</span>
        </div>
        <ul className="space-y-2 text-xs text-[#B8C0CE] leading-relaxed list-disc pl-4">
          <li>
            <strong>Recommended Low-Budget Model:</strong> Start with pretrained{' '}
            <span className="text-[#F3F5F8] font-medium">Wan 2.2 TI2V-5B</span> (Apache 2.0, 24GB VRAM, 720p/24fps) or{' '}
            <span className="text-[#F3F5F8] font-medium">LTX-Video</span> on an on-demand RTX 4090 (RunPod / Vast.ai / Modal).
          </li>
          <li>
            <strong>Why 30–60s uses multiple scenes:</strong> Open-weight models render ~5 seconds per clip cleanly. ReelCraft splits your 30–60s video into 5–6 second scenes, passes character reference images where supported, and uses FFmpeg to normalize FPS/resolution, stitch clips, and verify final duration.
          </li>
          <li>
            <strong>Full Guides in Repo:</strong> Read <code className="font-mono">README.md</code> and{' '}
            <code className="font-mono">docs/deployment/WINDOWS_BEGINNER_SETUP.md</code> for complete instructions including PostgreSQL backups and S3 storage.
          </li>
        </ul>
      </section>
    </div>
  );
};
