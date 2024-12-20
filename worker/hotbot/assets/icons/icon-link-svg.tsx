import React from 'react'

export interface IconMainSVGProps {
    fill?: string
}
function IcoLinkSVG({ fill }: IconMainSVGProps) {
    return (
        <svg
            width="34"
            height="34"
            viewBox="0 0 34 34"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M26 0H8C3.58172 0 0 3.58172 0 8V26C0 30.4183 3.58172 34 8 34H26C30.4183 34 34 30.4183 34 26V8C34 3.58172 30.4183 0 26 0Z"
                fill={fill}
            />
            <path
                d="M14 22H12C10.6739 22 9.40215 21.4732 8.46447 20.5355C7.52678 19.5979 7 18.3261 7 17C7 15.6739 7.52678 14.4021 8.46447 13.4645C9.40215 12.5268 10.6739 12 12 12H14"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
            <path
                d="M20 12H22C23.3261 12 24.5979 12.5268 25.5355 13.4645C26.4732 14.4021 27 15.6739 27 17C27 18.3261 26.4732 19.5979 25.5355 20.5355C24.5979 21.4732 23.3261 22 22 22H20"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
            <path
                d="M13 17H21"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        </svg>
    )
}

export default IcoLinkSVG
