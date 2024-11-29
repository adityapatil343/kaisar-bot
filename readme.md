# Kaisar ZeroNode bot

## Description
This script automates registration, network or node operations and daily claim for Kaisar ZeroNode.

## Features
- **Automated node and daily claim interaction**
- **Automatic account registration**
- **Automatic claim mining rewards**
- **Multi account**
- **Proxy support**

## Prerequisites
- [Node.js](https://nodejs.org/) (version 12 or higher)

## Installation

1. Clone the repository to your local machine:
   ```bash
	git clone https://github.com/recitativonika/kaisar-zero-node-bot.git
   ```
2. Navigate to the project directory:
	```bash
	cd kaisar-zero-node-bot
	```
3. Install the necessary dependencies:
	```bash
	npm install
	```

## Usage
1. Register to blockless bless network account first, if you don't have you can register [here](https://zero.kaisar.io/register?ref=SOXdEc181) or you can put email and password that you desire in to automatically register, check next part to do that. 
2. Set and Modify `user.txt` with your account data. If you don't have account, you can just put email and password that you want to register and it will automatically register account for you. Put the data in `user.txt` with format like this:
	```bash
	email1,password2,proxy1
	email2,password2,proxy2
	```
	if you dont want to use proxy, you don't need to put the proxy.
3. After put data in `user.txt`, run this script
    ```bash
    node setup.js
    ```
    This script will automatically register account if you don't have account `(You need to check email and open the link to verify the account, after that you can rerun again the script)`. The setup script will automatically fill and save the needed data to the `data.txt`, it will look like this:
    ```bash
    email1,token1,extensionid1,proxy1
    email2,token2,extensionid2,proxy2
    ```
    if you not use proxy when registering account and want to use proxy when run the bot, you can add it manually
4. Run the script:
	```bash
	node index.js
	```

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

## Note
This script only for testing purpose, using this script might violates ToS and may get your account permanently banned.

My reff code if you want to use :) : 
https://zero.kaisar.io/register?ref=juxtor577
