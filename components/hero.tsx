import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const hero = () => {
  return (
    <div className="pb-20 px-4 h-screen flex items-center justify-center">
      <div className="container mx-auto text-center">
        <h1 className="text-5xl md:text-8xl lg:text-[105px] pb-6 gradient-title">
          Track your money <br /> with Intelligence
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Flow is an AI-powered, easy-to-use expense tracker that helps you
          manage your money.
        </p>
        <div>
          <Link href="/dashboard">
            <Button size={"lg"} className="px-8">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default hero;
