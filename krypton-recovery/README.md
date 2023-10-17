# Krypton Recovery

This repo is associated with the web frontend and backend database of Krypton recovery process. `frontend` folder contains the web frontend for guardians to sign a recovery transaction, and `server` folder contains the database that stores information regarding all ongoing recovery transactions (how many signatures are needed, what public keys are being recovered).

## 🧑‍💻 Getting started

Make sure you have [git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git), [Node](https://nodejs.org/en/) and [yarn](https://yarnpkg.com/getting-started/install) installed. Then clone the repo 

```
git clone https://github.com/kevinxyc1/krypton-recovery.git
cd krypton-recovery
```

### 💻 Frontend

```
cd frontend
yarn && npm install && nvm use 16
```
You can now view the running frontend at [http://localhost:3000](http://localhost:3000)

### 📁 Backend Database

```
cd backend
node index.js
```
You can now view the running frontend at [http://localhost:5000](http://localhost:5000)
