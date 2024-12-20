import React from 'react'
interface ProfileIconProps {
    fill?: string
}
function KeyIcon({ fill }: ProfileIconProps) {
    return (
        <svg
            width="26"
            height="26"
            viewBox="0 0 26 26"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <g clip-path="url(#clip0_1436_519)">
                <path
                    d="M6.25736 11.4717C4.24145 13.4876 4.24145 16.756 6.25736 18.7719C8.27327 20.7879 11.5417 20.7879 13.5576 18.7719C15.2109 17.1186 15.5063 14.6238 14.4477 12.6674L16.6863 10.4288L18.2506 11.9931L20.3364 9.90736L18.7721 8.34302L19.815 7.30013L17.7292 5.21435L12.3619 10.5816C10.4056 9.52297 7.9107 9.81837 6.25736 11.4717ZM8.34315 13.5575C9.20718 12.6935 10.6078 12.6935 11.4718 13.5575C12.3359 14.4215 12.3359 15.8221 11.4718 16.6862C10.6078 17.5502 9.20718 17.5502 8.34315 16.6862C7.47911 15.8221 7.47911 14.4215 8.34315 13.5575Z"
                    fill={fill}
                />
            </g>
            <defs>
                <clipPath id="clip0_1436_519">
                    <rect
                        width="17.6985"
                        height="17.6985"
                        fill="white"
                        transform="translate(0 12.5146) rotate(-45)"
                    />
                </clipPath>
            </defs>
        </svg>
    )
}

export default KeyIcon
