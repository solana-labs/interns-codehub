"use client";

import { ClusterNames } from "@/app/utils/types";
import { useCluster } from "@/app/utils/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { ClusterOption } from "./cluster-option";

export const ClusterSelect = () => {
	const [open, setOpen] = useState(false);
	const clusterRef = useRef<HTMLDivElement>(null);
	const { cluster, setCluster } = useCluster();

	const toggleClusterMenu = useCallback(() => {
		setOpen((o) => !o);
	}, []);

	const closeClusterMenu = useCallback(() => {
		setOpen(false);
	}, []);

	useEffect(() => {
		const listener = ({ target }: MouseEvent | TouchEvent) => {
			if (!clusterRef?.current?.contains(target as Node)) {
				closeClusterMenu();
			}
		};
		document.addEventListener("mousedown", listener);
		document.addEventListener("touchstart", listener);

		return () => {
			document.removeEventListener("mousedown", listener);
			document.removeEventListener("touchstart", listener);
		};
	}, [clusterRef, closeClusterMenu]);

	const handleClick = (clusterName: string) => {
		setCluster(clusterName);
		toggleClusterMenu();
	};

	return (
		<div className="flex relative w-full text-xs sm:text-sm" ref={clusterRef}>
			<ClusterOption
				cluster={cluster}
				isSelected={true}
				handleClick={handleClick}
			/>
			{open && (
				<div className="absolute right-0 z-10 w-full xs:w-36 sm:w-44 mt-10 xs:mt-11 origin-bottom-right shadow-xl">
					{Object.values(ClusterNames)
						.filter((clusterName) => clusterName.name !== cluster)
						.map((clusterName, idx) => {
							return (
								<ClusterOption
									key={idx}
									cluster={clusterName.name}
									isSelected={false}
									handleClick={handleClick}
								/>
							);
						})}
				</div>
			)}
		</div>
	);
};
