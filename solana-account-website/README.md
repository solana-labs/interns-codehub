# SolD: A Solana Data Editor

This website acts as an editor for the [Solana Data Program V0](https://github.com/nvsriram/solana-data-program). It allows the user to view/edit the data and associated metadata for a given Data Account or upload your own file using the Solana Data Program

## 🧑‍💻 Getting Started

### 👀 To view Data Account details

- Select the Solana cluster (`Mainnet Beta`, `Devnet`, `Testnet`, `Custom`) on the top right
- To view the details regarding the Data Account:
  - Enter the `PublicKey` of the data account in the search bar and search for it
  - Navigate to `/<Data Account PublicKey>?cluster=<Cluster Name>`
- If the Data Account is valid, you should be able to view the metadata associated with the Data Account like its `Authority`, `Data Status`, `Serialization Status`, etc., and its `Data` will be displayed in the format as specified by the `Data Type`
- On error, you will be met with an informative error message

### 📄 To upload your own file

- Select the Solana cluster (`Mainnet Beta`, `Devnet`, `Testnet`, `Custom`) on the top right
- To access the _Upload_ page:
  - Click on the `Get Started!` button on the home page
  - Search for `upload` in the search bar
  - Navigate to `/upload`
- In the _Upload_ page, you will be met with various options:
  1. Sign in with your wallet that will act as the `Fee Payer` for the transactions
  2. Enter the `Authority` of the Data Account. Only the `Authority` can make changes to the Data Account
  3. Choose the file you wish to upload
  4. On uploading the file, the <i title="CUSTOM, JSON, IMG, or HTML">`Data Type`</i> and `Initial Size`</i> will autopopulate based on the file, however they can be overridden
  5. If not satisfied with the autopopulated `Data Type`, you may choose a different type
  6. If you wish for the account to not be realloc-ed and remain a static size, leave the `Dynamic/Static` checkbox unchecked
  7. Enter the initial size in bytes to allocate to the Data Account
  8. Once satisfied with all the options, click on the `Confirm Upload` button to upload the file
  9. You should receive a prompt to sign the transactions
  10. Once signed, the Data Account will be created (and the created Data Account `PublicKey` will be displayed) and initialized (with the PDA) and finally the file would be uploaded in chunks together. You should be able to track the progress via the progress bar
  11. Once the upload is complete, you can navigate to the link to view the Data Account details
  12. On error, you will be met with an informative error message

### :pencil2: To update your data

- Go to the [Data Account details page](#to-view-data-account-details)
- Choose the `Data Type` you wish to set
- Click on the Edit button and make changes
- Once satisfied with your changes, click Save
- This will ask you to sign on the transaction if you are logged in as the authority. Otherwise, it will display an error
- Once the transaction goes through, the page will reload and you can see the changes being reflected

### 🗄️ To list all Data Accounts associated with an Authority

- Enter `authority/<Authority PublicKey>` in the search bar
- This will index the Data Program and return a list of all the data accounts that have given `PublicKey` as their `Authority`
- You can sort by `Data Account`, `Data Type`, and/or `Data Status`
- Clicking on a particular Data Account will take you to its [Data Account details page](#to-view-data-account-details)
- If you are logged in as the authority:
  - You can individually Finalize the data or Close the data account to reclaim its SOL
  - Alternatively, you can select multiple accounts and finalize/close them all at once by clicking on the `Actions` dropdown button and following the prompts

### 🏁 To finalize your data

**NOTE: The Finalize action cannot be reverted. Once finalized, the data can no longer be updated.**

- Go to the [Data Account details page](#to-view-data-account-details)
- Ensure the Data Account `Data Status` is not already `FINALIZED`
- Click on the `Actions` dropdown button next to the `Data Status`
- Ensure you are logged in as the authority. Otherwise, the button will be disabled
- Once logged in as the authority, click on the `Finalize` button
- This will open a modal that will ask you to confirm that you want to finalize the data. Click `Yes, I'm sure...`
- This will ask you to sign on the transaction if you are logged in as the authority. Otherwise, it will display an error
- Once the transaction goes through, the page will reload and you can see the changes being reflected

### ❌ To close your data account and associated metadata account and reclaim SOL

**NOTE: The Close action cannot be reverted. Once closed, the data account and the associated metadata account will no longer exist.**

- Go to the [Data Account details page](#to-view-data-account-details)
- Click on the `Actions` dropdown button next to the `Data Status`
- Ensure you are logged in as the authority. Otherwise, the button will be disabled
- Once logged in as the authority, click on the `Close` button
- This will open a modal that will ask you to confirm that you want to close the accounts and reclaim SOL. Click `Yes, I'm sure...`
- This will ask you to sign on the transaction if you are logged in as the authority. Otherwise, it will display an error
- Once the transaction goes through, the page will reload and you can see the changes being reflected

## 🌐 API route(s)

With the website running, you can also navigate to the following API route(s):

### Get Data Account Metadata

Use this API route to get the associated metadata (extracted from the PDA) for a given Data Account

- **URL**

  `/api/meta/{dataAccount}?cluster={clusterName}`

- **Method:**

  `GET`

- **URL Params**

  **Required:**

  `dataAccount=<PublicKey>`

- **Query String Params**

  **Required:**

  `clusterName=<"Mainnet Beta" | "Devnet" | "Testnet" | "Custom">`

- **Success Response:**

  - **Code:** 200 <br />
    **Content:**
    ```javascript
    {
    	data_status: DataStatusOption;
    	serialization_status: SerializationStatusOption;
    	authority: string;
    	is_dynamic: boolean;
    	data_version: number;
    	data_type: number;
    	bump_seed: number;
    }
    ```

- **Error Response:**

  - **Code:** 400 BAD REQUEST <br />
    **Content:**
    - `{ error: "Invalid Cluster" }`: if the clusterName is invalid **OR**
    - `{ error: "Invalid Data Account PublicKey" }`: if no dataAccount was provided or if the data account is not a valid base58 PublicKey **OR**
    - `{ error: "No metadata corresponding to the Data Account" }`: if the dataAccount PDA does not exist or if it has no metadata

  **OR**

  - **Code:** 405 METHOD NOT ALLOWED <br />
    **Content:** `{ error : "Unsupported Method" }`: if the API is accessed by any method other than GET

- **Sample Call:**

  ```javascript
  fetch(
  	`/api/meta/HoyEJgwKhQG1TPRB2ziBU9uGziwy4f25kDcnKDNgsCkg?cluster=Devnet`
  ).then((res) => {
  	if (!res.ok) {
  		res.json().then(({ error }: ApiError) => {
  			console.error(error);
  		});
  	} else {
  		res.json().then((account_meta: IDataAccountMeta) => {
  			console.log(account_meta);
  		});
  	}
  });
  ```

### Get Data Account Data

Use this API route to get the data for a given Data Account.

- **URL**

  `/api/data/{dataAccount}?cluster={clusterName}&ext={mimeType}`

- **Method:**

  `GET`

- **URL Params**

  **Required:**

  `dataAccount=<PublicKey>`

- **Query String Params**

  **Required:**

  `clusterName=<"Mainnet Beta" | "Devnet" | "Testnet" | "Custom">`

  **Optional**

  `mimeType=<any valid MIME type`

- **Success Response:**

  - **Code:** 200 <br />
    **Content:**
    ```javascript
    Buffer;
    ```

- **Error Response:**

  - **Code:** 400 BAD REQUEST <br />
    **Content:**
    - `{ error: "Invalid Cluster" }`: if the clusterName is invalid **OR**
    - `{ error: "Invalid Data Account PublicKey" }`: if no dataAccount was provided or if the data account is not a valid base58 PublicKey **OR**
    - `{ error: "No data corresponding to the Data Account" }`: if the dataAccount does not exist or if it has no data

  **OR**

  - **Code:** 405 METHOD NOT ALLOWED <br />
    **Content:** `{ error : "Unsupported Method" }`: if the API is accessed by any method other than GET

- **Sample Call:**

  ```javascript
  fetch(
  	`/api/data/HoyEJgwKhQG1TPRB2ziBU9uGziwy4f25kDcnKDNgsCkg?cluster=Devnet&ext=text/html`
  ).then((res) => {
  	if (!res.ok) {
  		res.json().then(({ error }: ApiError) => {
  			console.error(error);
  		});
  	} else {
  		res.text().then((data: string) => {
  			console.log(data);
  		});
  	}
  });
  ```

## 💻 Instructions for running the project locally

1. Install the dependencies: `npm install`
2. Run the development server: `npm run dev`
3. Navigate to [http://localhost:3000](http://localhost:3000)
