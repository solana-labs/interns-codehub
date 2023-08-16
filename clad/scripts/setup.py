# e.g. MINT_AUTHORITY=your_base58_address_used_for_anchor_localnet python3 setup.py

# pip3 install base58 gitpython
import base64
import base58
import json
import os
import subprocess
import git

if not 'MINT_AUTHORITY' in os.environ:
	print('MINT_AUTHORITY must be set to a base58 public key')
	exit(1)

MINT_AUTHORITY = os.environ['MINT_AUTHORITY']

ROOT_GIT_DIR = git.Repo('.', search_parent_directories=True).working_tree_dir
SCRIPTS_DIR = os.path.join(ROOT_GIT_DIR, 'scripts')

list = {
	'usdc': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
	'bonk': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
	'fida': 'EchesyfXePKdLtoiZSL8pBe8Myagyy8ZRqsACNCFGnvp', # Bonfida
	'hnt': 'hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux', # Helium HNT
	'ray': '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', # Raydium DAO token
	'mngo': 'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac', # Mango DAO token
	'orca': 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', # Orca DAO token
}

for symbol, address in list.items():
	file_name = os.path.join(SCRIPTS_DIR, 'accounts/{symbol}.json'.format(symbol=symbol))

	bashDownloadCmd = 'solana account {address} -u m --output json-compact --output-file {file_name}'.format(address=address, file_name=file_name)
	process = subprocess.Popen(bashDownloadCmd.split(), stdout=subprocess.PIPE)
	output, error = process.communicate()

	if error:
		print(error)
		exit(1)

	# print(output)

	print('Setting mock {symbol} mint authority to {authority}'.format(symbol=symbol.upper(), authority=MINT_AUTHORITY))

	token = json.load(open(file_name))
	
	data = bytearray(base64.b64decode(token['account']['data'][0]))
	# mint authority data slice
	data[4:4+32] = base58.b58decode(MINT_AUTHORITY)
	# print(base64.b64encode(data))

	token['account']['data'][0] = base64.b64encode(data).decode('utf8')
	json.dump(token, open(file_name, 'w'))

	print('...done')
