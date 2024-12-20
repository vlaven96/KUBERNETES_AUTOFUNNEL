import React from "react";

interface IconRemoveSVGProps {
  fill?: string;
}

function IconRemoveSVG({ fill }: IconRemoveSVGProps) {
  return (
    <svg width="12" height="12" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.615 16C2.155 16 1.771 15.846 1.463 15.538C1.15433 15.2293 1 14.845 1 14.385V1.99998H0V0.99998H4V0.22998H10V0.99998H14V1.99998H13V14.385C13 14.845 12.846 15.229 12.538 15.537C12.2293 15.8456 11.845 16 11.385 16H2.615ZM4.808 13H5.808V3.99998H4.808V13ZM8.192 13H9.192V3.99998H8.192V13Z" fill={fill} />
    </svg>

  );
}

export default IconRemoveSVG;
