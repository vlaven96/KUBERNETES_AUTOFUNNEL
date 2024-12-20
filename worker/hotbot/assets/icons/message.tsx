import React from "react";

interface MessageIconProps {
  fill?: string;
}

function MessageIcon({ fill }: MessageIconProps) {
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
        d="M5.38 15.833L1.666 18.75V3.333A.833.833 0 012.5 2.5h15a.833.833 0 01.833.833V15a.833.833 0 01-.833.833H5.38zm.453-7.5V10H7.5V8.333H5.833zm3.334 0V10h1.666V8.333H9.167zm3.333 0V10h1.667V8.333H12.5z"
      ></path>
    </svg>
  );
}

export default MessageIcon;
