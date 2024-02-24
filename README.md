# LAVA NEAR HOT WALLET CLAIMER

LAVA Near HOT Wallet claimer for automatic claiming HOT token using Near/Lava mainnet RPC.

## Setup
- install nodejs.
- cd to project dir.
- run ```npm install```.
- ceate file with name ```account.txt``` and add ur wallet deails with this format ```accountID|privateKEY``` , example ```test.near|akalsjfklasjfklasjfklasf```. it support multiple wallet
so just write down like this
```
test.near|akalsjfklasjfklasjfklasf
test.near|akalsjfklasjfklasjfklasf
test.near|akalsjfklasjfklasjfklasf
```
- run ```npm run claim```.

## Note
- if you want to run using Near Mainnet / Lava Near mainnet, check up the ```rpc.js``` and uncomment using ```ctrl+/``` the RPC you want to use.

- if you want to use lava RPC to claim hot, im recomended to use bot wallet, i mean HOT now already nerf the minter who use automatic claim , thats why i recomended u to use new wallet or bot wallet. just for hot claim, lava rpc will still work even if you use on other wallet.



