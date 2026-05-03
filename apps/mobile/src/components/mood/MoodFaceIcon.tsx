import Svg, { Circle, Path } from "react-native-svg";
import type { MoodLevel } from "@/types";

interface MoodFaceIconProps {
  level: MoodLevel;
  selected?: boolean;
  size?: number;
}

const FACE_PATHS: Record<MoodLevel, string> = {
  1: "M13 32c4-5 14-5 18 0",
  2: "M14 31c4-3 12-3 16 0",
  3: "M14 28h16",
  4: "M13 27c4 5 14 5 18 0",
  5: "M12 26c4 7 16 7 20 0",
};

export function MoodFaceIcon({ level, selected = false, size = 34 }: MoodFaceIconProps) {
  const stroke = selected ? "#FFFFFF" : "#64748B";
  const fill = selected ? "rgba(255,255,255,0.16)" : "#F8FAFC";
  const cheek = selected ? "rgba(255,255,255,0.42)" : "#E9D5FF";

  return (
    <Svg width={size} height={size} viewBox="0 0 44 44" accessibilityLabel={`Humeur ${level}`}>
      <Circle cx="22" cy="22" r="18" fill={fill} stroke={stroke} strokeWidth={2.25} />
      {level === 1 ? (
        <>
          <Path
            d="M14 18c2-2 5-2 7 0"
            stroke={stroke}
            strokeWidth={2.4}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M23 18c2-2 5-2 7 0"
            stroke={stroke}
            strokeWidth={2.4}
            strokeLinecap="round"
            fill="none"
          />
        </>
      ) : level === 2 ? (
        <>
          <Path
            d="M14 19c2-1 5-1 7 0"
            stroke={stroke}
            strokeWidth={2.4}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M23 19c2-1 5-1 7 0"
            stroke={stroke}
            strokeWidth={2.4}
            strokeLinecap="round"
            fill="none"
          />
        </>
      ) : (
        <>
          <Circle cx="16.5" cy="18" r="2" fill={stroke} />
          <Circle cx="27.5" cy="18" r="2" fill={stroke} />
        </>
      )}
      {level >= 4 && (
        <>
          <Circle cx="12.5" cy="24" r="2.4" fill={cheek} />
          <Circle cx="31.5" cy="24" r="2.4" fill={cheek} />
        </>
      )}
      <Path
        d={FACE_PATHS[level]}
        stroke={stroke}
        strokeWidth={2.6}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
