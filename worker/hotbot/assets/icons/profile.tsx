import React from "react";
interface ProfileIconProps {
  fill?: string;
}
function ProfileIcon({ fill }: ProfileIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        fill={fill}
        fillRule="evenodd"
        d="M6.667 5.833a3.333 3.333 0 116.666 0 3.333 3.333 0 01-6.666 0zm0 5A4.167 4.167 0 002.5 15 2.5 2.5 0 005 17.5h10a2.5 2.5 0 002.5-2.5 4.167 4.167 0 00-4.167-4.167H6.667z"
        clipRule="evenodd"
      ></path>
    </svg>
  );
}

export default ProfileIcon;
