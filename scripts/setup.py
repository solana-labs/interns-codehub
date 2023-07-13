# e.g. MINT_AUTHORITY=your_base58_address_used_for_anchor_localnet python3 setup.py

import base64
import base58
import json
import os
import subprocess

bashCommandUsdc = "solana account EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v -u m --output json-compact --output-file accounts/usdc.json"
process = subprocess.Popen(bashCommandUsdc.split(), stdout=subprocess.PIPE)
output, error = process.communicate()

if error:
	print(error)
	exit(1)

print(output)

if not 'MINT_AUTHORITY' in os.environ:
	print('MINT_AUTHORITY must be set to a base58 public key')
	exit(1)

MINT_AUTHORITY = os.environ['MINT_AUTHORITY']
print('Setting mock USDC\'s mint authority to', MINT_AUTHORITY)

usdc = json.load(open('accounts/usdc.json'))
data = bytearray(
	base64.b64decode(usdc['account']['data'][0])
)

# mint authority data slice
data[4:4+32] = base58.b58decode(MINT_AUTHORITY)
# print(base64.b64encode(data))

usdc['account']['data'][0] = base64.b64encode(data).decode('utf8')
json.dump(usdc, open('accounts/usdc.json', 'w'))

print('...done')
