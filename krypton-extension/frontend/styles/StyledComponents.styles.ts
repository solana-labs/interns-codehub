import styled from "styled-components";
import { Button, Form, Input } from "antd";

export const Card = styled.div`
  margin: 1rem 1rem;
  padding: 1.3rem;
  width: 16rem;
  height: 19rem;
  text-align: left;
  color: #fff;
  background-color: rgb(34, 34, 34);
  text-decoration: none;
  border: 1px solid #efefef;
  border-radius: 5px;
  transition: color 0.15s ease, border-color 0.15s ease,
    background-color 0.15s ease;

  &:hover,
  &:focus,
  &:active {
    border-color: #ddd;
    background-color: rgb(34, 34, 34);
  }

  & > h2 {
    margin: 0 0 1rem 0;
    font-size: 1.5rem;
    color: #fff;
  }

  & > p {
    margin: 0;
    font-size: 1.25rem;
    line-height: 1.5;
  }

  div.buttons {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 1.5rem auto 0.5rem;
  }

  .disabledButton {
    width: 150px;
  }
`;

export const Dashboard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  width: 30rem;
  margin-top: 2rem;
`;

export const Airdrop = styled(Button)`
  position: relative;
  color: #5273e0;
`;

export const Question = styled.p`
  position: relative;
  top: 66%;
  left: 108%;
  border: 0.5px solid #ccc;
  color: #a5a5a5;
  border-radius: 50%;
  text-align: center;
  width: 1.1rem;
  height: 1.1rem;
  font-size: 0.6rem;
`;

export const Box = styled.div`
  text-align: center;
  width: 90%;
  padding-top: 0.7rem;
  padding: 10px;
  color: #fff;
  font-weight: 600;
  background-color: rgb(42, 42, 42);
  border-radius: 4px;
  transition: color 0.15s ease, border-color 0.15s ease,
    background-color 0.15s ease;
  margin-bottom: 0.5rem;
`;

export const CheckContainer = styled.div`
  width: 77%;
  margin: auto;
  position: relative;
  max-width: 750px;
`;

export const CheckImage = styled.img`
  width: 100%;
`;

export const CheckFrom = styled.p`
  position: absolute;
  top: 11%;
  left: 3.6%;
`;

export const Processed = styled.a`
  position: absolute;
  top: 20%;
  left: 3.6%;
  font-style: italic;
  color: #dc1fff;
`;

export const CheckDate = styled.p`
  position: absolute;
  top: 19%;
  left: 68%;
`;

export const RecipientInput = styled(Input)`
  position: absolute;
  top: 35%;
  left: 17%;
  height: 9%;
  width: 50%;
`;

export const AmountInput = styled(Input)`
  position: absolute;
  top: 35%;
  left: 76%;
  height: 9%;
  width: 15%;
`;

export const SignatureInput = styled(Button)`
  position: absolute;
  top: 69%;
  left: 59%;
  height: 9%;
  width: 32.5%;
`;

export const AmountText = styled.p`
  position: absolute;
  top: 52%;
  left: 5%;
`;

export const RatioText = styled.p`
  position: absolute;
  top: 71%;
  left: 11%;
`;

export const StyledForm = styled(Form)`
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 300px;
`;