import { useSearchParams } from "next/navigation";
import { ReactNode, useState } from "react";
import { Wallet } from "./components/wallet/wallet";
import { ClusterNames } from "./utils/types";
import { ClusterContext, EditorThemeContext } from "./utils/utils";

const ContextProviders = ({ children }: { children: ReactNode }) => {
	const searchParams = useSearchParams();
	const currentCluster = Object.values(ClusterNames).find(
		({ name }) => name === searchParams.get("cluster")
	)?.name;

	const [cluster, setCluster] = useState<string>(
		currentCluster ? currentCluster : ClusterNames.DEVNET.name
	);
	const [editorTheme, setEditorTheme] = useState("solD");
	return (
		<ClusterContext.Provider value={{ cluster, setCluster }}>
			<Wallet>
				<EditorThemeContext.Provider value={{ editorTheme, setEditorTheme }}>
					{children}
				</EditorThemeContext.Provider>
			</Wallet>
		</ClusterContext.Provider>
	);
};

export default ContextProviders;
