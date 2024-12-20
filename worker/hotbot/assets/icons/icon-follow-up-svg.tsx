import React from 'react'

interface IconFollowUpSVGProps {
    fill?: string
}
function IconFollowUpSVG({ fill }: IconFollowUpSVGProps) {
    return (
        <svg
            width="34"
            height="34"
            viewBox="0 0 34 34"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <g clip-path="url(#clip0_32_332)">
                <rect width="34" height="34" rx="8" fill={fill} />
                <path
                    d="M13.7844 21L11 23.1875V11.625C11 11.4592 11.0658 11.3003 11.1831 11.1831C11.3003 11.0658 11.4592 11 11.625 11H22.875C23.0408 11 23.1997 11.0658 23.3169 11.1831C23.4342 11.3003 23.5 11.4592 23.5 11.625V20.375C23.5 20.5408 23.4342 20.6997 23.3169 20.8169C23.1997 20.9342 23.0408 21 22.875 21H13.7844ZM14.125 15.375V16.625H15.375V15.375H14.125ZM16.625 15.375V16.625H17.875V15.375H16.625ZM19.125 15.375V16.625H20.375V15.375H19.125Z"
                    fill="white"
                />
            </g>
            <defs>
                <clipPath id="clip0_32_332">
                    <rect width="34" height="34" rx="8" fill="white" />
                </clipPath>
            </defs>
        </svg>
    )
}

export default IconFollowUpSVG
