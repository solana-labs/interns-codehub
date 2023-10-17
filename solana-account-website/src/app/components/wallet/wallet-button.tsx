"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import {
	WalletConnectButton,
	WalletIcon,
	WalletModalButton,
	useWalletModal,
} from "@solana/wallet-adapter-react-ui";
import { ButtonProps } from "@solana/wallet-adapter-react-ui/lib/types/Button";
import type { FC } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const WalletButton: FC<ButtonProps> = ({ children, ...props }) => {
	const { publicKey, wallet, disconnect } = useWallet();
	const { setVisible } = useWalletModal();
	const [copied, setCopied] = useState(false);
	const [active, setActive] = useState(false);
	const ref = useRef<HTMLUListElement>(null);

	const base58 = useMemo(() => publicKey?.toBase58(), [publicKey]);
	const content = useMemo(() => {
		if (children) return children;
		if (!wallet || !base58) return null;
		return base58.slice(0, 6) + ".." + base58.slice(-6);
	}, [children, wallet, base58]);

	const copyAddress = useCallback(async () => {
		if (base58) {
			await navigator.clipboard.writeText(base58);
			setCopied(true);
			setTimeout(() => setCopied(false), 400);
		}
	}, [base58]);

	const openDropdown = useCallback(() => {
		setActive(true);
	}, []);

	const closeDropdown = useCallback(() => {
		setActive(false);
	}, []);

	const openModal = useCallback(() => {
		setVisible(true);
		closeDropdown();
	}, [setVisible, closeDropdown]);

	useEffect(() => {
		const listener = (event: MouseEvent | TouchEvent) => {
			const node = ref.current;

			// Do nothing if clicking dropdown or its descendants
			if (!node || node.contains(event.target as Node)) return;

			closeDropdown();
		};

		document.addEventListener("mousedown", listener);
		document.addEventListener("touchstart", listener);

		return () => {
			document.removeEventListener("mousedown", listener);
			document.removeEventListener("touchstart", listener);
		};
	}, [ref, closeDropdown]);

	if (!wallet)
		return <WalletModalButton {...props}>{children}</WalletModalButton>;
	if (!base58)
		return <WalletConnectButton {...props}>{children}</WalletConnectButton>;

	return (
		<div className="wallet-adapter-dropdown">
			<button
				className={`wallet-adapter-button-trigger wallet-adapter-button ${
					props.className || ""
				}`}
				disabled={props.disabled}
				tabIndex={0}
				type="button"
				aria-expanded={active}
				style={{ pointerEvents: active ? "none" : "auto", ...props.style }}
				onClick={openDropdown}
			>
				<i className="wallet-adapter-button-start-icon mr-2 sm:mr-[12px]">
					<WalletIcon wallet={wallet} />
				</i>
				<p className="w-full xs:w-fit">{content}</p>
			</button>
			<ul
				aria-label="dropdown-list"
				className={`w-full xs:w-fit wallet-adapter-dropdown-list ${
					active && "wallet-adapter-dropdown-list-active"
				} bg-violet-700 dark:bg-solana-purple p-0.5`}
				ref={ref}
				role="menu"
			>
				<li
					onClick={copyAddress}
					className="text-xs sm:text-sm wallet-adapter-dropdown-list-item [&:not([disabled]):hover]:bg-stone-800/30"
					role="menuitem"
				>
					{copied ? "Copied" : "Copy address"}
				</li>
				<li
					onClick={openModal}
					className="text-xs sm:text-sm wallet-adapter-dropdown-list-item [&:not([disabled]):hover]:bg-stone-800/30"
					role="menuitem"
				>
					Change wallet
				</li>
				<li
					onClick={disconnect}
					className="text-xs sm:text-sm wallet-adapter-dropdown-list-item [&:not([disabled]):hover]:bg-stone-800/30"
					role="menuitem"
				>
					Disconnect
				</li>
			</ul>
		</div>
	);
};

export default WalletButton;
