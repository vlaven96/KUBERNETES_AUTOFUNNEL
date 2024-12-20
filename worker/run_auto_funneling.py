import requests
import json
import subprocess

AIRTABLE_API_KEY = 'patx9H8Z5CpvEQCZ1.5b02ca1438712d21ac7809e82b6bead7bc2512e54ce0676b6bde72e09eb8e7bf'
AIRTABLE_BASE_ID = 'appiaCnT5CjmEukDq'
AIRTABLE_TABLE_NAME = 'tblmuTTidcm3zJDSL'
AIRTABLE_VIEW_NAME = 'NEW AGE'
RENDER_API_KEY = 'rnd_c6ZV443ak9kYfIDpbWkqqCc0DJWq'
DOCKER_IMAGE = 'docker.io/adicraciun/afn:latest'
CUPID_TOKEN = '5cb75ec7721e3ed209fa22fc55480edf'
MODEL_NAME = 'zara'

def get_snap_accounts():
    url = f'https://api.airtable.com/v0/{AIRTABLE_BASE_ID}/{AIRTABLE_TABLE_NAME}?view={AIRTABLE_VIEW_NAME}'
    headers = {
        'Authorization': f'Bearer {AIRTABLE_API_KEY}',
    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()['records']

def start_render_service(account):
    url = 'https://api.render.com/v1/services'
    headers = {
        'Authorization': f'Bearer {RENDER_API_KEY}',
        'Content-Type': 'application/json',
    }
    try:
        data = {
            'name': f"service-{account['fields']['Username']}",
            'type': 'background_worker',
            'autoDeploy': "yes",
            'ownerId': 'usr-cogfhtuv3ddc73ec3m30',
            'envVars': [
                {'key': 'USERNAME', 'value': account['fields']['Username']},
                {'key': 'PASSWORD', 'value': account['fields']['Password']},
                {'key': 'PROXY_HOST', 'value': account['fields']['Proxy_Host'][0]},
                {'key': 'PROXY_PORT', 'value': 44444},
                {'key': 'PROXY_USERNAME', 'value': account['fields']['Proxy_Username'][0]},
                {'key': 'PROXY_PASSWORD', 'value': account['fields']['Proxy_Password'][0]},
                {'key': 'CUPID_TOKEN', 'value': CUPID_TOKEN},
                {'key': 'MODEL_NAME', 'value': MODEL_NAME},
            ],
            'serviceDetails': {
                'env': "image"
            },
            'image': {
                'imagePath': DOCKER_IMAGE,
                'ownerId': 'usr-cogfhtuv3ddc73ec3m30'
            }
        }

        print(json.dumps(data, indent=4))
        
        response = requests.post(url, headers=headers, data=json.dumps(data))
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"An error occurred: {e.response.text}")
        # Option to start containers locally for each snap account

import asyncio

async def start_local_container(account):
    try:
        container_name = f"local_container_{account['fields']['Username']}"
        env_vars = [
            f"-e USERNAME={account['fields']['Username']}",
            f"-e PASSWORD={account['fields']['Password']}",
            f"-e PROXY_HOST={account['fields']['Proxy_Host'][0]}",
            f"-e PROXY_PORT={44444}",
            f"-e PROXY_USERNAME={account['fields']['Proxy_Username'][0]}",
            f"-e PROXY_PASSWORD={account['fields']['Proxy_Password'][0]}",
            f"-e CUPID_TOKEN={CUPID_TOKEN}",
            f"-e MODEL_NAME={MODEL_NAME}"
        ]
        env_vars_str = " ".join(env_vars)
        command = f"docker run --name {container_name} {env_vars_str} {DOCKER_IMAGE}"
        process = await asyncio.create_subprocess_shell(command, shell=True)
        await process.communicate()
        print(f"Started local container: {container_name}")
    except Exception as e:
        print(f"An error occurred while starting the local container for account {account['fields']['Username'][0]}: {e}")

async def start_index_js(account):
    try:
        env_vars = {
            'USERNAME': account['fields']['Username'],
            'PASSWORD': account['fields']['Password'],
            'PROXY_HOST': account['fields']['Proxy_Host'][0],
            'PROXY_PORT': '44444',
            'PROXY_USERNAME': account['fields']['Proxy_Username'][0],
            'PROXY_PASSWORD': account['fields']['Proxy_Password'][0],
            'CUPID_TOKEN': CUPID_TOKEN,
            'MODEL_NAME': MODEL_NAME
        }
        env_vars_str = " ".join([f"{key}={value}" for key, value in env_vars.items()])
        command = f"{env_vars_str} node index.js"
        process = await asyncio.create_subprocess_shell(command, shell=True)
        await process.communicate()
        print(f"Started index.js for account: {account['fields']['Username']}")
    except Exception as e:
        print(f"An error occurred while starting index.js for account {account['fields']['Username']}: {e}")

import random
import asyncio

async def main():
    accounts = get_snap_accounts()
    for i, account in enumerate(accounts[:5]):  # Limit to 5 accounts
        await start_render_service(account)
        # await asyncio.sleep(150)

if __name__ == '__main__':
    asyncio.run(main())