import React, { useState, useEffect, ReactElement } from "react";
import { Button } from "antd";
import Link from "next/link";
import { LoginOutlined, LoadingOutlined } from "@ant-design/icons";
import { Card } from "../../styles/StyledComponents.styles";

const LoginAccount = (): ReactElement => {
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setLoading(false);
  }, []);

  const handleGenerate = () => {
    setLoading(true);
  };

  return (
    <Card>
      <LoginOutlined
        style={{ fontSize: "3rem", margin: "2rem 0", display: "block" }}
      />
      <h2>Already have a wallet?</h2>
      <p>
        View your portfolio and guardian list, buy and transfer assets.
      </p>

      <div className={"buttons"}>
        {!loading && (
          <Link href={`/wallet`} passHref>
            <Button type="default" onClick={handleGenerate}>
              Login to Wallet
            </Button>
          </Link>
        )}
        {loading && (
          <Button className={"disabledButton"} disabled>
            <LoadingOutlined spin />
          </Button>
        )}
      </div>
    </Card>
  );
};

export default LoginAccount;
