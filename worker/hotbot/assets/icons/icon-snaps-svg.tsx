import React from 'react'

interface IconSnapSVGProps {
    fill?: string
}
function IconSnapSVG({ fill }: IconSnapSVGProps) {
    return (
        <svg
            width="34"
            height="34"
            viewBox="0 0 34 34"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <rect width="34" height="34" rx="8" fill={fill} />
            <path
                d="M10.6667 24C10.2083 24 9.81611 23.8369 9.49 23.5108C9.16389 23.1847 9.00056 22.7922 9 22.3333V10.6667C9 10.2083 9.16333 9.81611 9.49 9.49C9.81667 9.16389 10.2089 9.00056 10.6667 9H22.3333C22.7917 9 23.1842 9.16333 23.5108 9.49C23.8375 9.81667 24.0006 10.2089 24 10.6667V22.3333C24 22.7917 23.8369 23.1842 23.5108 23.5108C23.1847 23.8375 22.7922 24.0006 22.3333 24H10.6667ZM11.5 20.6667H21.5L18.375 16.5L15.875 19.8333L14 17.3333L11.5 20.6667Z"
                fill="white"
            />
        </svg>
    )
}

export default IconSnapSVG
