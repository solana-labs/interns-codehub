import { Link } from "react-router-dom"

export const Header = () => {
    return <Link to="/">
        <div className="w-full">
            <h1 className="text-emerald-200 opacity-40 hover:opacity-60 text-lg text-center p-2 border-b border-emerald-200">bloss-demo</h1>
        </div>
    </Link>
};
