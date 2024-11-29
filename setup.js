const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const readline = require('readline');
const { HttpsProxyAgent } = require('https-proxy-agent');

const COLORS = {
    GREEN: "\x1b[32m",
    BOLD_CYAN: "\x1b[1m\x1b[36m",
    BOLD_YELLOW: "\x1b[1m\x1b[33m",
    RED: "\x1b[31m",
    RESET: "\x1b[0m"
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function generateUniqueIdentifier() {
    return crypto.randomUUID();
}

function generateRandomBrowserId() {
    return `browser-${crypto.randomBytes(6).toString('hex')}`;
}

function generateRandomHardwareId() {
    return `hardware-${crypto.randomBytes(6).toString('hex')}`;
}

function readTextFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return data.split('\n').map(line => line.trim()).filter(line => line !== '');
    } catch (error) {
        console.error(`Error reading file at ${filePath}:`, error.message);
        return [];
    }
}

function saveToFileContent(data) {
    try {
        fs.writeFileSync('data.txt', data.join('\n') + '\n');
    } catch (error) {
        console.error("Error saving data to file:", error.message);
    }
}

function updateUserData(email, token, extensionId, proxy, skipExtensionUpdate = false) {
    const data = readTextFile('data.txt');
    const updatedData = [];
    const emailNormalized = email.trim().toLowerCase();
    let emailExists = false;

    data.forEach(line => {
        const parts = line.split(',');
        const existingEmailNormalized = parts[0].trim().toLowerCase();
        if (existingEmailNormalized === emailNormalized) {
            updatedData.push(`${email},${token},${skipExtensionUpdate ? parts[2] : extensionId},${proxy}`);
            emailExists = true;
        } else {
            updatedData.push(line);
        }
    });

    if (!emailExists) {
        updatedData.push(`${email},${token},${extensionId},${proxy}`);
    }

    saveToFileContent(updatedData);
}

function createApiClient(proxy, useProxy) {
    const agent = useProxy ? new HttpsProxyAgent(proxy) : undefined;
    return axios.create({
        baseURL: 'https://zero-api.kaisar.io/',
        headers: {
            'Content-Type': 'application/json'
        },
        httpsAgent: agent,
    });
}

async function verifyExtensionId(apiClient, extensionId, token, browserId, hardwareId) {
    try {
        console.log("Initializing ExtensionID verification...");

        const response = await apiClient.post('/mining/start', {
            extension: extensionId,
            browserId,
            hardwareId
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.status === 200) {
            console.log(`${COLORS.GREEN}ExtensionID verification was successful!${COLORS.RESET}`);
            return true;
        }
    } catch (error) {
        if (error.response) {
            const { status } = error.response;
            if (status === 412) {
                console.log(`${COLORS.RED}Verification failed, another ExtensionID is already running. Please try again later.${COLORS.RESET}`);
            } else if (status === 401) {
                console.log(`${COLORS.RED}Unauthorized access. Please check your token and permissions.${COLORS.RESET}`);
            }
        }
        return false;
    }
}

async function loginUser(email, password, proxy, useProxy) {
    const apiClient = createApiClient(proxy, useProxy);

    try {
        const response = await apiClient.post('/auth/login', { email, password });

        if (response.data) {
            const token = response.data.data.accessToken;
            console.log(`Logging into account ${COLORS.BOLD_CYAN}${email}${COLORS.RESET}...`);
            console.log(`${COLORS.GREEN}Successfully logged in for ${email}${COLORS.RESET}`);

            const extensionId = generateUniqueIdentifier();
            const browserId = generateRandomBrowserId();
            const hardwareId = generateRandomHardwareId();
            const verificationSuccess = await verifyExtensionId(apiClient, extensionId, token, browserId, hardwareId);
            updateUserData(email, token, extensionId, proxy, !verificationSuccess && response.status === 412);
        } else {
            console.error(`Failed to log in for ${email}:`, response.data.message);
        }
    } catch (error) {
        console.error(`Encountered an error logging in for ${email}. Please ensure email confirmation:`, error.message);
    }
}

async function registerUser(email, password, proxy, useProxy) {
    const apiClient = createApiClient(proxy, useProxy);
    const referralCode = 'juxtor577';

    try {
        const response = await apiClient.post('/auth/register', { email, password, referrer: referralCode });
        if (response.data) {
            console.log(`${COLORS.GREEN}Account registration successful for ${email}. Verify your email and rerun the script to obtain the token.${COLORS.RESET}`);
        } else {
            console.error(`Registration failed for ${email}:`, response.data.message);
        }
    } catch (error) {
        if (error.response?.data?.error?.code === 410) {
            console.log(`Account ${COLORS.BOLD_CYAN}${email}${COLORS.RESET} already exists. Attempting login...`);
            await loginUser(email, password, proxy, useProxy);
        } else {
            console.error(`Error encountered during registration for ${email}. Please try again later.`);
        }
    }
}

async function processUsers(useProxy) {
    try {
        const users = readTextFile('user.txt').map(line => {
            const parts = line.split(',');
            return {
                email: parts[0],
                password: parts[1],
                proxy: parts[2] || 'noproxy'
            };
        });

        for (let i = 0; i < users.length; i++) {
            const { email, password, proxy } = users[i];
            console.log(`Using proxy: ${COLORS.BOLD_YELLOW}${proxy}${COLORS.RESET} for account: ${COLORS.BOLD_CYAN}${email}${COLORS.RESET}`);
            await new Promise(resolve => setTimeout(resolve, 1000)); 
            await registerUser(email, password, useProxy ? proxy : 'noproxy', useProxy);
        }
        rl.close();

    } catch (error) {
        console.error("Problem reading user.txt file:", error.message);
    }
}

function alignCenter(text, width) {
    const pad = Math.floor((width - text.length) / 2);
    return ' '.repeat(pad) + text + ' '.repeat(pad);
}

const consoleWidth = process.stdout.columns;
console.log("");
console.log(`${COLORS.BOLD_YELLOW}${alignCenter("============================================", consoleWidth)}${COLORS.RESET}`);
console.log(`${COLORS.BOLD_YELLOW}${alignCenter("Kaisar ZeroNode bot", consoleWidth)}${COLORS.RESET}`);
console.log(`${COLORS.BOLD_YELLOW}${alignCenter("github.com/recitativonika", consoleWidth)}${COLORS.RESET}`);
console.log(`${COLORS.BOLD_YELLOW}${alignCenter("============================================", consoleWidth)}${COLORS.RESET}`);
console.log("");

rl.question(`${COLORS.BOLD_YELLOW}Do you want to use a proxy? (y/n): ${COLORS.RESET}`, (useProxyInput) => {
    const useProxy = useProxyInput.trim().toLowerCase() === 'y';
    processUsers(useProxy);
});
