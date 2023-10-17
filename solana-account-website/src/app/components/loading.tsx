"use client";

import Image from "next/image";
import Logo from "public/favicon.ico";

const Loading = () => {
	return (
		<div className="w-full flex justify-center pt-10">
			<Image src={Logo} alt="logo" className="animate-pulse" />
		</div>
	);
};

export default Loading;
