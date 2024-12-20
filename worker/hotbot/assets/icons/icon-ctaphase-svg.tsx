import React from "react";

interface IconCtaPhaseSVGProps {
  fill?: string;
}
function IconCtaPhaseSVG({ fill }: IconCtaPhaseSVGProps) {
  return (
    <svg width="35" height="34" viewBox="0 0 35 34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" width="34" height="34" rx="8" fill={fill} />
      <path d="M12.5 20H14.5C14.5 21.08 15.87 22 17.5 22C19.13 22 20.5 21.08 20.5 20C20.5 18.9 19.46 18.5 17.26 17.97C15.14 17.44 12.5 16.78 12.5 14C12.5 12.21 13.97 10.69 16 10.18V8H19V10.18C21.03 10.69 22.5 12.21 22.5 14H20.5C20.5 12.92 19.13 12 17.5 12C15.87 12 14.5 12.92 14.5 14C14.5 15.1 15.54 15.5 17.74 16.03C19.86 16.56 22.5 17.22 22.5 20C22.5 21.79 21.03 23.31 19 23.82V26H16V23.82C13.97 23.31 12.5 21.79 12.5 20Z" fill="white" />
    </svg>
  );
}

export default IconCtaPhaseSVG;
