import {
  BadgeCheck,
  Fan,
  IndianRupee,
  Languages,
  ReceiptText,
  Scale,
  ScanEye,
  Snowflake,
  Vault,
  type LucideIcon,
} from "lucide-react";
import { motion, useTransform, type MotionValue } from "motion/react";
import { useReducedMotion } from "../motion/hooks";

interface SphereConfig {
  id: string;
  size: number;
  left: string;
  top: string;
  icon: LucideIcon;
  paccha: boolean;
  floatAnim: string;
}

const SPHERES: SphereConfig[] = [
  {
    id: "vault",
    size: 320,
    left: "4%",
    top: "6%",
    icon: Vault,
    paccha: true,
    floatAnim: "float-a 9.5s ease-in-out 0s infinite",
  },
  {
    id: "scan-eye",
    size: 210,
    left: "24%",
    top: "68%",
    icon: ScanEye,
    paccha: false,
    floatAnim: "float-b 8.2s ease-in-out 0.6s infinite",
  },
  {
    id: "fan",
    size: 160,
    left: "14%",
    top: "46%",
    icon: Fan,
    paccha: false,
    floatAnim: "float-c 7.4s ease-in-out 1.2s infinite",
  },
  {
    id: "languages",
    size: 260,
    left: "76%",
    top: "8%",
    icon: Languages,
    paccha: true,
    floatAnim: "float-b 10.4s ease-in-out 0.3s infinite",
  },
  {
    id: "scale",
    size: 360,
    left: "68%",
    top: "52%",
    icon: Scale,
    paccha: false,
    floatAnim: "float-a 11s ease-in-out 0.8s infinite",
  },
  {
    id: "receipt",
    size: 150,
    left: "46%",
    top: "8%",
    icon: ReceiptText,
    paccha: false,
    floatAnim: "float-c 8.6s ease-in-out 1.5s infinite",
  },
  {
    id: "rupee",
    size: 190,
    left: "84%",
    top: "38%",
    icon: IndianRupee,
    paccha: true,
    floatAnim: "float-a 7.8s ease-in-out 0.4s infinite",
  },
  {
    id: "snowflake",
    size: 140,
    left: "36%",
    top: "78%",
    icon: Snowflake,
    paccha: false,
    floatAnim: "float-b 9.1s ease-in-out 1.1s infinite",
  },
  {
    id: "badge-check",
    size: 175,
    left: "56%",
    top: "74%",
    icon: BadgeCheck,
    paccha: false,
    floatAnim: "float-c 8.0s ease-in-out 0.9s infinite",
  },
];

function SphereItem({
  cfg,
  progress,
  reduced,
}: {
  cfg: SphereConfig;
  progress: MotionValue<number>;
  reduced: boolean;
}) {
  // Bigger spheres drift faster (up to -120px at size 360)
  const driftPx = -Math.round((cfg.size / 360) * 120);
  const y = useTransform(progress, [0, 1], [0, driftPx]);
  const Icon = cfg.icon;
  const iconSize = Math.round(cfg.size * 0.38);

  return (
    <motion.div
      aria-hidden="true"
      style={{
        left: cfg.left,
        top: cfg.top,
        width: `${cfg.size}px`,
        height: `${cfg.size}px`,
        y: reduced ? 0 : y,
        willChange: "transform",
      }}
      className="pointer-events-none absolute"
    >
      <div
        className="flex size-full items-center justify-center rounded-full"
        style={{
          background:
            "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.35), rgba(255,255,255,0.06) 35%, rgba(255,255,255,0.02) 60%, rgba(255,255,255,0.10) 100%)",
          boxShadow:
            "inset -20px -30px 60px rgba(0,0,0,0.6), inset 10px 10px 30px rgba(255,255,255,0.08), 0 30px 60px rgba(0,0,0,0.5)",
          backdropFilter: "blur(2px)",
          animation: reduced ? "none" : cfg.floatAnim,
        }}
      >
        <Icon
          size={iconSize}
          strokeWidth={1}
          style={{
            color: cfg.paccha ? "rgba(229,254,64,0.55)" : "rgba(255,255,255,0.35)",
          }}
        />
      </div>
    </motion.div>
  );
}

export interface GlassSpheresProps {
  progress: MotionValue<number>;
}

export function GlassSpheres({ progress }: GlassSpheresProps) {
  const reduced = Boolean(useReducedMotion());

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ willChange: "transform" }}
    >
      {SPHERES.map((cfg) => (
        <SphereItem
          key={cfg.id}
          cfg={cfg}
          progress={progress}
          reduced={reduced}
        />
      ))}
    </div>
  );
}
