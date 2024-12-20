import React from 'react'

interface IconObjectivesSVGProps {
    fill?: string
}
function IconUploadSVG({ fill }: IconObjectivesSVGProps) {
    return (
        <svg
            width="37"
            height="32"
            viewBox="0 0 37 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <rect x="0.5" y="0.5" width="36" height="31" rx="3.5" fill="#0975F1" />
            <rect x="0.5" y="0.5" width="36" height="31" rx="3.5" stroke="#0975F1" />
            <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M17.2929 6.29289C17.6834 5.90237 18.3166 5.90237 18.7071 6.29289L22.7071 10.2929C23.0976 10.6834 23.0976 11.3166 22.7071 11.7071C22.3166 12.0976 21.6834 12.0976 21.2929 11.7071L18 8.41421L14.7071 11.7071C14.3166 12.0976 13.6834 12.0976 13.2929 11.7071C12.9024 11.3166 12.9024 10.6834 13.2929 10.2929L17.2929 6.29289Z"
                fill="white"
            />
            <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M18 6C18.5523 6 19 6.44772 19 7V19C19 19.5523 18.5523 20 18 20C17.4477 20 17 19.5523 17 19V7C17 6.44772 17.4477 6 18 6Z"
                fill="white"
            />
            <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M11 15C11.5523 15 12 15.4477 12 16V21C12 22.1046 12.8954 23 14 23H22C23.1046 23 24 22.1046 24 21V16C24 15.4477 24.4477 15.5 25 15.5C25.5523 15.5 26 15.4477 26 16V21C26 23.2091 24.2091 25 22 25H14C11.7909 25 10 23.2091 10 21V16C10 15.4477 10.4477 15 11 15Z"
                fill="white"
            />
        </svg>
    )
}

export default IconUploadSVG
