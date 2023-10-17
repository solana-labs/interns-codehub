import { LoadingOutlined, CheckCircleFilled } from "@ant-design/icons";
import Steps from "antd/lib/steps";
import { useEffect, useState } from "react";

const OnboardingSteps = ({
  currStep,
  shouldGen,
  genStep,
  testing,
}: {
  currStep: number;
  shouldGen: boolean;
  genStep: number;
  testing?: boolean;
}) => {
  const [steps, setSteps] = useState(
    testing
      ? [
          "Confirming your signup...",
          "Initializing social wallet...",
          "Creating mint account...",
          "Creating token account for mint...",
          "Minting to NFT token account...",
          "Disabling future minting...",
        ]
      : ["Confirming your signup...", "Initializing social wallet..."]
  );
  const genSteps = [
    "Initializing avatar...",
    "Finding the environment...",
    "Picking the oufit...",
    "Fixing the hair...",
    "Choosing the eyes...",
    "Perfecting the smile...",
    "Adding finishing touches...",
  ];

  useEffect(() => {
    if (shouldGen) {
      setSteps((prev) => [...prev, "Generating unique avatar..."]);
    }
  }, [shouldGen, setSteps]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        marginTop: "2rem",
      }}
    >
      <Steps
        direction="vertical"
        size="small"
        current={currStep}
        style={{ margin: "auto" }}
      >
        {steps.map((item, idx) => {
          return (
            <Steps.Step
              key={item}
              title={
                <span
                  style={{
                    color:
                      currStep === idx
                        ? "#fff"
                        : currStep > idx
                        ? "#415bf5"
                        : "#b3b3b3",
                  }}
                >
                  {item}
                </span>
              }
              style={{ width: "fit-content", marginLeft: "2rem" }}
              icon={
                currStep === idx ? (
                  <LoadingOutlined style={{ color: "#fff" }} spin />
                ) : currStep > idx ? (
                  <div style={{ borderRadius: "50%", backgroundColor: "#fff" }}>
                    <CheckCircleFilled style={{ color: "#415bf5" }} />
                  </div>
                ) : (
                  <CheckCircleFilled style={{ color: "#b3b3b3" }} />
                )
              }
            />
          );
        })}
      </Steps>
      {shouldGen && currStep >= steps.length - 1 && (
        <Steps
          direction="vertical"
          size="small"
          current={genStep}
          progressDot
          style={{ marginLeft: "20%" }}
        >
          {genSteps.map((item, idx) => {
            return (
              <Steps.Step
                key={item}
                title={
                  <span
                    style={{
                      color:
                        genStep === idx
                          ? "#fff"
                          : genStep > idx
                          ? "#415bf5"
                          : "#b3b3b3",
                    }}
                  >
                    {item}
                  </span>
                }
                style={{ width: "fit-content", marginLeft: "2rem" }}
              />
            );
          })}
        </Steps>
      )}
    </div>
  );
};

export default OnboardingSteps;
