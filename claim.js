import { KeyPair, keyStores, connect, Near } from "near-api-js";
import { Twisters } from "twisters";
import BigNumber from "bignumber.js";
import fs from "fs";
import { levels, storeFireplace } from "./utils.js";
import { mainnetConfig } from "./rpc.js";

const near = new Near(mainnetConfig);
const twisters = new Twisters();

const getAccount = (accountId, privateKey) =>
  new Promise(async (resolve, reject) => {
    try {
      const keyStore = new keyStores.InMemoryKeyStore();
      const keyPair = KeyPair.fromString(privateKey);
      await keyStore.setKey(mainnetConfig.networkId, accountId, keyPair);

      const connectionConfig = {
        deps: {
          keyStore,
        },
        ...mainnetConfig,
      };

      const accountConnection = await connect(connectionConfig);
      const account = await accountConnection.account(accountId);

      resolve(account);
    } catch (error) {
      reject(error);
    }
  });

const miningProgress = (detailUser) => {
  const currentTime = Date.now();

  const timeSinceLastClaimHours =
    (currentTime - detailUser.last_claim / 1e6) / (1000 * 60 * 60);
  const hotPerHourInt = getHotPerHourInt(detailUser);
  const earnedHOT = timeSinceLastClaimHours * hotPerHourInt;

  return earnedHOT.toFixed(6);
};

const earned = (detailUser) => {
  const hotPerHourInt = getHotPerHourInt(detailUser);
  const earned = (storageCapacityMs(detailUser) / 3600000) * hotPerHourInt;

  return earned;
};

const storageCapacityMs = (detailUser) => {
  const storageBooster = getBooster(detailUser.storage);
  const fireplaceBooster = getBooster(detailUser.firespace);

  let earned = Math.floor(
    (parseInt(storageBooster.value + "0") / 1e6) / (fireplaceBooster.value / 10000)
  );

  earned = detailUser.boost == 99 ? earned*=10 : earned;
  return earned;
};

const getHotPerHourInt = (detailUser) => {
  const fireplaceBooster = getBooster(detailUser.firespace);

  const woodBooster = getBooster(detailUser.boost);

  return new BigNumber(woodBooster.value * fireplaceBooster.value).dividedBy(
    1e7
  );
};

const getUser = async (near, accountId) => {
  const argument = {
    account_id: accountId,
  };

  const result = await near.connection.provider.query({
    account_id: "game.hot.tg",
    finality: "optimistic",
    request_type: "call_function",
    method_name: "get_user",
    args_base64: Buffer.from(JSON.stringify(argument)).toString("base64"),
  });

  const detailUser = JSON.parse(Buffer.from(result.result).toString());

  return detailUser;
};

const miningEarned = async (detailUser) => {
  const remainingMiningResult = earned(detailUser);

  return remainingMiningResult;
};

const getBooster = (e) => {
  let booster = levels.find((t) => t.id == e);
  if (!booster) return null;
  let additionalInfo = storeFireplace.find((t) => t.id == e);

  return additionalInfo ? { ...additionalInfo, ...booster } : booster;
};

const getNearBalance = async (accountId, privateKey) => {
  const account = await getAccount(accountId, privateKey);
  const Nearbalance = await account.getAccountBalance();
  return new BigNumber(Nearbalance.total).dividedBy(1e24);
};

const processAccount = async (accountId, privateKey) => {
  const mineAndUpdate = async () => {
    try {
      const detailUserResult = await getUser(near, accountId);
      const NearBalanceUser = await getNearBalance(accountId, privateKey);
      let miningEarnedMust = await miningEarned(detailUserResult);
      let miningProgressResult = miningProgress(detailUserResult);
      const hotPerHour = getHotPerHourInt(detailUserResult);

      if (parseFloat(miningProgressResult) >= parseFloat(miningEarnedMust)) {
        twisters.put(accountId, {
          text: `
Account ID : ${accountId}
Near Balance :${NearBalanceUser}
Hot In Storage : ${miningProgressResult}
Storage Full at ${miningEarnedMust}
Hot / Hour : ${hotPerHour}/hour 
Status : Claiming...
`,
        });

        const account = await getAccount(accountId, privateKey);
        const callContract = await account.functionCall({
          contractId: "game.hot.tg",
          methodName: "claim",
          args: {},
        });

        twisters.put(accountId, {
          text: `
Account ID : ${accountId}
Near Balance :${NearBalanceUser}
Hot In Storage : ${miningProgressResult}
Storage Full at ${miningEarnedMust}
Hot / Hour : ${hotPerHour}/hour 
Status : Claimed... ${callContract.transaction.hash}
`,
        });

        twisters.put(accountId, {
          active: false,
          removed: true,
          text: `
Account ID : ${accountId}
Near Balance :${NearBalanceUser}
Hot In Storage : ${miningProgressResult}
Storage Full at ${miningEarnedMust}
Hot / Hour : ${hotPerHour}/hour 
Status : Claimed... ${callContract.transaction.hash}
`,
        });

        await mineAndUpdate();
        return;
      }

      miningProgressResult = miningProgress(detailUserResult);
      twisters.put(accountId, {
        text: `
Account ID : ${accountId}
Near Balance :${NearBalanceUser}
Hot In Storage : ${miningProgressResult}
Storage Full at ${miningEarnedMust}
Hot / Hour : ${hotPerHour}/hour 
Status : Mining
`,
      });

      setTimeout(mineAndUpdate, 500);
    } catch (error) {
      console.log(error);
      twisters.put(accountId, {
        active: false,
        text: `
Account ID : ${accountId}
Status : Error processing account, please check logs for details.
`,
      });

      twisters.put(accountId, {
        removed: true,
      });
    }
  };

  await mineAndUpdate();
};

(async () => {
  const accountsData = fs.readFileSync("./account.txt", "utf-8").split(/\r?\n/);

  const allPromise = [];
  const promises = accountsData.map(async (account) => {
    const [accountId, privateKey] = account.split("|");
    processAccount(accountId, privateKey);
  });

  for (const processAccount of promises) {
    allPromise.push(await processAccount);
  }
})();
