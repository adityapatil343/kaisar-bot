const fs = require('fs');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const readline = require('readline');

const COLORS = {
    RESET: "\x1b[0m",
    BOLD_YELLOW: "\x1b[1;33m",
    BOLD_CYAN: "\x1b[1;36m",
    GREEN: "\x1b[32m",
    RED: "\x1b[31m",
    WHITE: "\x1b[37m"
};

function centerAlignText(text, width) {
    const pad = Math.floor((width - text.length) / 2);
    return ' '.repeat(pad) + text + ' '.repeat(pad);
}

const consoleWidth = process.stdout.columns;
console.log("");
console.log(`${COLORS.BOLD_YELLOW}${centerAlignText("============================================", consoleWidth)}${COLORS.RESET}`);
console.log(`${COLORS.BOLD_YELLOW}${centerAlignText("The Unique Bot Chronicles", consoleWidth)}${COLORS.RESET}`);
console.log(`${COLORS.BOLD_YELLOW}${centerAlignText("github.com/uniquebotchronicler", consoleWidth)}${COLORS.RESET}`);
console.log(`${COLORS.BOLD_YELLOW}${centerAlignText("============================================", consoleWidth)}${COLORS.RESET}`);
console.log("");

function fetchConfigurationData() {
    const data = fs.readFileSync('data.txt', 'utf8');
    return data.split('\n').filter(line => line.trim() !== '').map(line => {
        const [email, token, extensionId, proxy] = line.split(',');
        return { email, token, extensionId, proxy };
    });
}

function createUniqueApiClient(proxy, token, useProxy) {
    const agent = useProxy ? new HttpsProxyAgent(proxy) : undefined;
    return axios.create({
        baseURL: 'https://zero-api.kaisar.io/',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        httpsAgent: agent,
    });
}

async function retrieveMissionTasks(email, proxy, token, useProxy, accountNumber) {
    const apiClient = createUniqueApiClient(proxy, token, useProxy);

    try {
        const response = await apiClient.get('mission/tasks');
        const tasks = response.data.data;
        const activeTaskIds = tasks
            .filter(task => task.status === 1)
            .map(task => task._id);

        if (activeTaskIds.length > 0) {
            console.log(`[${COLORS.BOLD_CYAN}${accountNumber}${COLORS.RESET}] Active tasks detected with IDs: ${activeTaskIds}`);
        }

        return activeTaskIds;
    } catch (error) {
        console.error(`[${COLORS.BOLD_CYAN}${accountNumber}${COLORS.RESET}] Failed to retrieve mission tasks for ${COLORS.BOLD_CYAN}${email}${COLORS.RESET}`);
        return null;
    }
}
async function claimMissionRewards(email, proxy, token, taskIds, useProxy, accountNumber) {
    const apiClient = createUniqueApiClient(proxy, token, useProxy);

    for (let taskId of taskIds) {
        try {
            const response = await apiClient.post(`mission/tasks/${taskId}/claim`, {});
            const task = response.data.data;
            console.log(`[${COLORS.BOLD_CYAN}${accountNumber}${COLORS.RESET}] Rewards successfully claimed from task ID: ${taskId}`);
        } catch (error) {
            console.error(`[${COLORS.BOLD_CYAN}${accountNumber}${COLORS.RESET}] Failed to claim task with ID: ${taskId} for ${COLORS.BOLD_CYAN}${email}${COLORS.RESET}`);
        }
    }
}

async function executeDailyLogin(email, proxy, token, useProxy, accountNumber) {
    const apiClient = createUniqueApiClient(proxy, token, useProxy);

    try {
        const response = await apiClient.post('checkin/check', {});
        const checkin = response.data.data;
        if (checkin) {
            console.log(`[${COLORS.BOLD_CYAN}${accountNumber}${COLORS.RESET}] Successfully logged in for the day at: ${checkin.time} for ${COLORS.BOLD_CYAN}${email}${COLORS.RESET}`);
        }
    } catch (error) {
        console.error(`[${COLORS.BOLD_CYAN}${accountNumber}${COLORS.RESET}] Daily login for ${COLORS.BOLD_CYAN}${email}${COLORS.RESET} failed: Already logged in today.`);
    }
}

async function verifyAndClaimTasks(email, proxy, token, useProxy, accountNumber) {
    const taskIds = await retrieveMissionTasks(email, proxy, token, useProxy, accountNumber);
    if (taskIds && taskIds.length > 0) {
        await claimMissionRewards(email, proxy, token, taskIds, useProxy, accountNumber);
    } else {
        console.log(`[${COLORS.BOLD_CYAN}${accountNumber}${COLORS.RESET}] No tasks available to claim for ${COLORS.BOLD_CYAN}${email}${COLORS.RESET}`);
    }
}

async function fetchMiningData(apiClient, extensionId, accountNumber) {
    try {
        const response = await apiClient.get('/mining/current', {
            params: { extension: extensionId }
        });

        if (response.data && response.data.data) {
            const miningData = response.data.data;

            updateMiningProgress(accountNumber, miningData);
            await updateMiningPoints(extensionId, miningData, apiClient, accountNumber); 

            if (miningData.ended === 1) {
                console.log(`[${COLORS.BOLD_CYAN}${accountNumber}${COLORS.RESET}] Mining has concluded. Proceeding to claim mining points.`);
                await claimMiningRewards(apiClient, extensionId, accountNumber);
            }
        }
    } catch (error) {
        console.error(`[${COLORS.BOLD_CYAN}${accountNumber}${COLORS.RESET}] Error fetching mining data: ${COLORS.RED}`, error.message || error, `${COLORS.RESET}`);
    }
}

async function updateMiningPoints(extensionId, miningData, apiClient, accountNumber) {
    const elapsedTimeInHours = (Date.now() - new Date(miningData.start).getTime() - miningData.miss) / 36e5;
    const points = elapsedTimeInHours * miningData.hourly;
    const miningPoint = Math.max(0, points);
    const totalPoints = await checkAccountBalance(apiClient, extensionId, accountNumber);
    console.log(`[${COLORS.BOLD_CYAN}${accountNumber}${COLORS.RESET}] Total Points: ${COLORS.GREEN}${totalPoints}${COLORS.RESET}, MiningPoints: ${COLORS.BOLD_CYAN}${miningPoint}${COLORS.RESET}, ElapsedTimeInHours: ${COLORS.BOLD_YELLOW}${elapsedTimeInHours}${COLORS.RESET}`);
}

function updateMiningProgress(accountNumber, miningData) {
    const currentTime = Date.now(); 
    const endTime = miningData.end;     
    const remainingTime = Math.max(0, endTime - currentTime); 

    console.log(`[${COLORS.BOLD_CYAN}${accountNumber}${COLORS.RESET}] Mining progress: EndTime: ${COLORS.BOLD_YELLOW}${endTime}${COLORS.RESET}, CurrentTime: ${COLORS.BOLD_YELLOW}${currentTime}${COLORS.RESET}, RemainingTime: ${COLORS.BOLD_YELLOW}${remainingTime}${COLORS.RESET}`);
}
async function claimMiningRewards(apiClient, extensionId, accountNumber) {
    try {
        console.log(`[${COLORS.BOLD_CYAN}${accountNumber}${COLORS.RESET}] Claiming mining points...`);
        const { data } = await apiClient.post('/mining/claim', { extension: extensionId });
        console.log(`[${COLORS.BOLD_CYAN}${accountNumber}${COLORS.RESET}] Claimed successfully: ${COLORS.GREEN}`, data, `${COLORS.RESET}`);
        await initiateFarming(apiClient, extensionId, accountNumber);
    } catch (error) {
        
    }
}
async function initiateFarming(apiClient, extensionId, accountNumber) {
    try {
        const response = await apiClient.post('/mining/start', {
            extension: extensionId
        });
        if (response.status === 200) {
            console.log(`[${COLORS.BOLD_CYAN}${accountNumber}${COLORS.RESET}] Mining initiated successfully`);
        }
    } catch (error) {
        if (error.response) {
            const { status, data } = error.response;
            console.error(`[${COLORS.BOLD_CYAN}${accountNumber}${COLORS.RESET}] Error initiating mining (HTTP Error): ${COLORS.RED}`, {
                status,
                data
            }, `${COLORS.RESET}`);

            if (status === 412 && data.error.message === 'Mining is already in progress.') {
                console.log(`[${COLORS.BOLD_CYAN}${accountNumber}${COLORS.RESET}] Mining already in progress. Skipping start process.`);
                return; 
            }
        } else {
            console.error(`[${COLORS.BOLD_CYAN}${accountNumber}${COLORS.RESET}] Error initiating mining: ${COLORS.RED}`, error.message || error, `${COLORS.RESET}`);
        }
    }
}

async function checkAccountBalance(apiClient, extensionId, accountNumber) {
    try {
        console.log(`[${COLORS.BOLD_CYAN}${accountNumber}${COLORS.RESET}] Checking account balances...`);
        const response = await apiClient.get('/user/balances');
        const balances = response.data.data[0].balance;
        console.log(`[${COLORS.BOLD_CYAN}${accountNumber}${COLORS.RESET}] Balances: ${COLORS.GREEN}`, balances, `${COLORS.RESET}`);
        return balances;
    } catch (error) { 
        console.error(`[${COLORS.BOLD_CYAN}${accountNumber}${COLORS.RESET}] Error checking account balances: ${COLORS.RED}`, error.message || error, `${COLORS.RESET}`);
        return null;
    }
}

async function executePingAndUpdate(accountNumber, email, token, proxy, useProxy) {
    const apiClient = createUniqueApiClient(proxy, token, useProxy);

    try {
        if (useProxy) {
            console.log(`[${COLORS.BOLD_CYAN}${accountNumber}${COLORS.RESET}] Attempting to ping ${COLORS.BOLD_CYAN}${email}${COLORS.WHITE} using proxy ${COLORS.BOLD_YELLOW}${proxy}${COLORS.RESET}`);
        } else {
            console.log(`[${COLORS.BOLD_CYAN}${accountNumber}${COLORS.RESET}] Attempting to ping ${COLORS.BOLD_CYAN}${email}${COLORS.WHITE} without proxy`);
        }
        const response = await apiClient.post('/extension/ping', {
            extension: token
        });

        console.log(`[${COLORS.BOLD_CYAN}${accountNumber}${COLORS.RESET}] ${COLORS.GREEN}Ping for ${COLORS.BOLD_CYAN}${email}${COLORS.RESET} was successful${COLORS.RESET}`);
        await fetchMiningData(apiClient, token, accountNumber);
    } catch (error) {
        const errorMessage = useProxy ?
            `Ping failed for ${COLORS.BOLD_CYAN}${email}${COLORS.RESET} using proxy ${COLORS.BOLD_YELLOW}${proxy}${COLORS.RESET}` :
            `Ping failed for ${COLORS.BOLD_CYAN}${email}${COLORS.RESET} without proxy`;
        console.error(`[${COLORS.BOLD_CYAN}${accountNumber}${COLORS.RESET}] ${COLORS.RED}${errorMessage}${COLORS.RESET}`);
    }
}

(async () => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question(`${COLORS.BOLD_YELLOW}Would you like to use a proxy? (y/n):${COLORS.RESET} `, async (useProxyInput) => {
        const useProxy = useProxyInput.trim().toLowerCase() === 'y';
        rl.close();

        const config = fetchConfigurationData();
        if (config.length === 0) {
            console.error("No configuration found in data.txt. Exiting...");
            return;
        }

        const lastExecution = {};
        const lastClaimTime = {};

        for (let i = 0; i < config.length; i++) {
            const { email, token, extensionId, proxy } = config[i];
            processAccountSequentially(i + 1, email, token, extensionId, proxy, useProxy, lastExecution, lastClaimTime);
        }

        async function processAccountSequentially(accountNumber, email, token, extensionId, proxy, useProxy, lastExecution, lastClaimTime) {
            while (true) {
                const now = Date.now();

                if (!lastExecution[token] || now - lastExecution[token] >= 12 * 60 * 60 * 1000) {
                    await executeDailyLogin(email, proxy, token, useProxy, accountNumber);
                    await verifyAndClaimTasks(email, proxy, token, useProxy, accountNumber);
                    lastExecution[token] = now;
                }

                if (!lastClaimTime[token] || now - lastClaimTime[token] >= 4 * 60 * 60 * 1000) {
                    await verifyAndClaimTasks(email, proxy, token, useProxy, accountNumber);
                    lastClaimTime[token] = now;
                }

                await executePingAndUpdate(accountNumber, email, token, proxy, useProxy);

                console.log(`[${COLORS.BOLD_CYAN}${accountNumber}${COLORS.RESET}] Pinging again in 1 minute for ${COLORS.BOLD_CYAN}${email}${COLORS.RESET}...`);
                await new Promise(resolve => setTimeout(resolve, 60000));
            }
        }
    });
})();
