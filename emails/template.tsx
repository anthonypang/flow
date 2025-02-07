import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface EmailProps {
  userName: string;
  type: "budget-alert" | "monthly-alert";
  data: {
    percentageUsed: number;
    budgetAmount: number;
    totalExpenses: number;
    accountName: string;
  };
}

export const Email = ({
  userName = "",
  type = "budget-alert",
  data,
}: EmailProps) => {
  if (type === "monthly-alert") {
    return (
      <Html>
        <Head />
      </Html>
    );
  }

  return (
    <Html>
      <Head />
      <Preview>Budget Alert</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Budget Alert</Heading>
          <Text style={styles.text}>Hello {userName},</Text>
          <Text style={styles.text}>
            {"You've used " +
              data.percentageUsed.toFixed(2) +
              "% of your monthly budget"}
          </Text>
          <Section style={styles.statsContainer}>
            <div style={styles.stat}>
              <Text style={styles.text}>Budget Amount</Text>
              <Text style={styles.heading}>
                ${data.budgetAmount.toFixed(2)}
              </Text>
            </div>
            <div style={styles.stat}>
              <Text style={styles.text}>Spent So Far</Text>
              <Text style={styles.heading}>
                ${data.totalExpenses.toFixed(2)}
              </Text>
            </div>
            <div style={styles.stat}>
              <Text style={styles.text}>Remaining</Text>
              <Text style={styles.heading}>
                ${(data.budgetAmount - data.totalExpenses).toFixed(2)}
              </Text>
            </div>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const styles = {
  body: {
    backgroundColor: "#f6f9fc",
    fontFamily: "-apple-system, sans-serif",
  },
  heading: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#2f2f2f",
  },
  text: {
    fontSize: "16px",
    color: "#2f2f2f",
  },
  statsContainer: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
  },
  stat: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
  },
  container: {
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    padding: "20px",
  },
};

export default Email;
