import React from "react";

interface AddIconProps {
  fill?: string;
}
function AddIcon({ fill }: AddIconProps) {
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
        d="M10 1.25A8.858 8.858 0 001.25 10 8.858 8.858 0 0010 18.75 8.858 8.858 0 0018.75 10 8.858 8.858 0 0010 1.25zm5 9.375h-4.375V15h-1.25v-4.375H5v-1.25h4.375V5h1.25v4.375H15v1.25z"
      ></path>
    </svg>
  );
}

export default AddIcon;
