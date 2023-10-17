import React, { useState, useEffect } from "react";
import { Button } from "antd";
import Link from "next/link";
import { BankOutlined, LoadingOutlined } from "@ant-design/icons";
import { Card } from "../../styles/StyledComponents.styles";

const CreateAccount = () => {
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setLoading(false);
  }, []);

  const handleGenerate = () => {
    setLoading(true);
  };

  return (
    <Card>
      <BankOutlined
        style={{ fontSize: "2rem", margin: "0.5rem 0", display: "block" }}
      />
      <h2>New to Krypton?</h2>
      <p>
        Create a new wallet to send, receive and swap Solana digital assets.
      </p>

      <div className={"buttons"}>
        {!loading && (
          <Link href={`/signup`} passHref>
            <Button type="primary" onClick={handleGenerate}>
              Create New Wallet
            </Button>
          </Link>
        )}
        {loading && (
          <Button className={"disabledButton"} disabled>
            <LoadingOutlined style={{ fontSize: 24, color: "#fff" }} spin />
          </Button>
        )}
      </div>
    </Card>
  );
};

export default CreateAccount;
