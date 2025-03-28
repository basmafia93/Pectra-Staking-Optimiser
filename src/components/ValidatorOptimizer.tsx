"use client";

import React, { useState, useEffect } from "react";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";

export function ValidatorOptimizer() {
  const [totalEth, setTotalEth] = useState(100000); // 100,000 ETH by default
  const [networkApr, setNetworkApr] = useState(3.38);
  const [years, setYears] = useState(3);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);
  const [isAssumptionsExpanded, setIsAssumptionsExpanded] = useState(false);

  // Recalculate whenever inputs change.
  useEffect(() => {
    calculateResults();
  }, [totalEth, networkApr, years]);

  const splitNetworkApr = (networkAprPercent: number) => {
    const clRatio = 0.825;
    const elRatio = 0.175;
    const clApr = networkAprPercent * clRatio;
    const elApr = networkAprPercent * elRatio;
    return { clApr, elApr };
  };

  const calculateElRewards = (initialStake: number, elAprPercent: number, years: number) => {
    const r = elAprPercent / 100;
    return initialStake * r * years;
  };

  const calculateClRewards = (balance: number, apr: number, isPectra: boolean = false) => {
    if (isPectra) {
      return balance * (Math.exp(apr / 100) - 1); // Continuous compounding for Pectra
    }
    return balance * (apr / 100); // Simple interest for standard method
  };

  // Simulate validator growth using flooring before reward calculation.
  const simulateValidatorGrowth = (initialStake: number, clApr: number, years: number) => {
    const balances = [initialStake];
    let current = initialStake;

    for (let i = 0; i < years; i++) {
      if (current >= 2048) {
        balances.push(2048);
        continue;
      }
      const base = Math.floor(current);
      const reward = base * (Math.exp(clApr / 100) - 1);
      current = Math.min(current + reward, 2048);
      balances.push(current);
    }

    return balances;
  };

  // Find optimal distribution so that after 'years' the balance is close to 2048 ETH.
  const findOptimalDistribution = (totalEth: number, networkAprPercent: number, years: number) => {
    const { clApr, elApr } = splitNetworkApr(networkAprPercent);
    const target = 2048;
    const tolerance = 0.0001;
    let low = 32;
    let high = target;

    const simulateToTarget = (initial: number) => {
      let balance = initial;
      for (let i = 0; i < years; i++) {
        if (balance >= target) return balance;
        const base = Math.floor(balance);
        const reward = base * (Math.exp(clApr / 100) - 1);
        balance = Math.min(balance + reward, target);
      }
      return balance;
    };

    while (high - low > tolerance) {
      const mid = (low + high) / 2;
      const finalBalance = simulateToTarget(mid);

      if (Math.abs(finalBalance - target) < tolerance) break;
      else if (finalBalance < target) low = mid;
      else high = mid;
    }

    const optimalStake = (low + high) / 2;
    const numValidators = Math.floor(totalEth / optimalStake);
    const remainingEth = totalEth - (numValidators * optimalStake);
    const hasExtra = remainingEth >= 32;

    return {
      optimalStake,
      numValidators,
      remainingEth,
      hasExtra,
    };
  };

  const calculateResults = () => {
    try {
      setError(null);

      const { clApr, elApr } = splitNetworkApr(networkApr);
      console.log('\n=== INITIAL SETUP ===');
      console.log('Network APR:', networkApr);
      console.log('CL APR:', clApr);
      console.log('Total ETH:', totalEth);
      console.log('Years:', years);

      const { optimalStake, numValidators, remainingEth, hasExtra } =
        findOptimalDistribution(totalEth, networkApr, years);
      console.log('\n=== OPTIMAL DISTRIBUTION ===');
      console.log('Optimal Stake:', optimalStake.toFixed(4));
      console.log('Number of Validators:', numValidators);
      console.log('Remaining ETH:', remainingEth.toFixed(4));
      console.log('Has Extra Validator:', hasExtra);

      // Initialize validators
      const mainValidators = Array(numValidators).fill(optimalStake);
      const extraValidator = hasExtra ? [remainingEth] : [];
      const allValidators = [...mainValidators, ...extraValidator];
      console.log('\n=== PECTRA VALIDATORS ===');
      console.log('Main Validators:', mainValidators.map(v => v.toFixed(4)));
      console.log('Extra Validator:', extraValidator.map(v => v.toFixed(4)));
      console.log('Total Validators:', allValidators.length);
      console.log('Total Staked:', allValidators.reduce((a, b) => a + b, 0).toFixed(4));

      const validatorBalances = allValidators.map(initialStake =>
        simulateValidatorGrowth(initialStake, clApr, years)
      );

      // Standard method: manual reinvestment, using simple interest.
      let standardTotalRewards = 0;
      let currentValidators = Math.floor(totalEth / 32);
      const standardYearlyRewards: number[] = [];
      let standardBalances = Array(currentValidators).fill(32);
      let standardTotalFees = currentValidators * 0.002;
      let excessRewards = 0;
      const WEEKS_PER_YEAR = 52;
      const GAS_COST_PER_WITHDRAWAL = 0.0001;

      console.log('\n=== STANDARD METHOD INITIAL ===');
      console.log('Initial Validators:', currentValidators);
      console.log('Initial Fees:', standardTotalFees.toFixed(4));
      console.log('Initial Balances:', standardBalances.map(b => b.toFixed(4)));
      console.log('Weekly Reward per Validator:', ((32 * (clApr / 100)) / WEEKS_PER_YEAR).toFixed(4));
      console.log('Gas Cost per Withdrawal:', GAS_COST_PER_WITHDRAWAL.toFixed(4));

      for (let year = 0; year < years; year++) {
        let yearRewards = 0;
        let newValidatorsNextWeek = 0;
        console.log(`\n=== STANDARD METHOD YEAR ${year + 1} ===`);
        for (let week = 0; week < WEEKS_PER_YEAR; week++) {
          let weekRewards = 0;
          for (let i = 0; i < currentValidators; i++) {
            const base = Math.floor(32);
            const weeklyReward = base * (Math.exp((clApr / 100) / WEEKS_PER_YEAR) - 1);
            weekRewards += weeklyReward;
            yearRewards += weeklyReward;
            excessRewards += weeklyReward;
            standardTotalFees += GAS_COST_PER_WITHDRAWAL;
          }
          while (excessRewards >= 32.002) {
            const newValidators = Math.floor(excessRewards / 32.002);
            if (newValidators > 0) {
              newValidatorsNextWeek += newValidators;
              standardTotalFees += newValidators * 0.002;
              excessRewards -= newValidators * 32.002;
            } else break;
          }
          if (week % 13 === 0) {
            console.log(`Week ${week + 1}:`, {
              weekRewards: weekRewards.toFixed(4),
              excessRewards: excessRewards.toFixed(4),
              currentValidators,
              newValidatorsNextWeek,
            });
          }
          if (newValidatorsNextWeek > 0) {
            currentValidators += newValidatorsNextWeek;
            standardBalances = [...standardBalances, ...Array(newValidatorsNextWeek).fill(32)];
            newValidatorsNextWeek = 0;
          }
        }
        standardYearlyRewards.push(yearRewards);
        standardTotalRewards += yearRewards;
        console.log(`Year ${year + 1} Summary:`, {
          yearRewards: yearRewards.toFixed(4),
          currentValidators,
          totalFeesSoFar: standardTotalFees.toFixed(4),
        });
      }

      // Pectra method: continuous compounding.
      let pectraTotalRewards = 0;
      let pectraTotalFees = numValidators * 0.002 + (hasExtra ? 0.002 : 0);
      const pectraYearlyRewards: number[] = [];
      let pectraBalances = [...mainValidators, ...extraValidator];

      console.log('\n=== PECTRA METHOD INITIAL ===');
      console.log('Initial Balances:', pectraBalances.map(b => b.toFixed(4)));
      console.log('Initial Fees:', pectraTotalFees.toFixed(4));
      console.log('Total Validators:', pectraBalances.length);

      for (let year = 0; year < years; year++) {
        let yearRewards = 0;
        console.log(`\n=== PECTRA METHOD YEAR ${year + 1} ===`);
        for (let i = 0; i < pectraBalances.length; i++) {
          const currentBalance = pectraBalances[i];
          if (currentBalance >= 2048) continue;
          const base = Math.floor(currentBalance);
          const reward = base * (Math.exp(clApr / 100) - 1);
          const newBalance = Math.min(currentBalance + reward, 2048);
          yearRewards += newBalance - currentBalance;
          pectraBalances[i] = newBalance;
        }
        pectraYearlyRewards.push(yearRewards);
        pectraTotalRewards += yearRewards;
        console.log(`Year ${year + 1} Summary:`, {
          yearRewards: yearRewards.toFixed(4),
          validatorBalances: pectraBalances.map(b => b.toFixed(4)),
          totalRewardsSoFar: pectraTotalRewards.toFixed(4),
        });
      }

      const standardInitialStake = currentValidators * 32;
      const pectraInitialStake = mainValidators.reduce((a, b) => a + b, 0) + (hasExtra ? remainingEth : 0);

      console.log('\n=== FINAL COMPARISON ===');
      console.log('Initial Stakes:', {
        standardInitialStake: standardInitialStake.toFixed(4),
        pectraInitialStake: pectraInitialStake.toFixed(4),
        totalEth: totalEth.toFixed(4),
      });

      const standardClApr = ((standardTotalRewards - standardTotalFees) / standardInitialStake / years) * 100;
      const pectraClApr = ((pectraTotalRewards - pectraTotalFees) / pectraInitialStake / years) * 100;

      console.log('Final Results:', {
        standardClApr: standardClApr.toFixed(4),
        pectraClApr: pectraClApr.toFixed(4),
        standardTotalRewards: standardTotalRewards.toFixed(4),
        pectraTotalRewards: pectraTotalRewards.toFixed(4),
        standardTotalFees: standardTotalFees.toFixed(4),
        pectraTotalFees: pectraTotalFees.toFixed(4),
        standardNetRewards: (standardTotalRewards - standardTotalFees).toFixed(4),
        pectraNetRewards: (pectraTotalRewards - pectraTotalFees).toFixed(4),
      });

      const standardTotal = standardTotalRewards - standardTotalFees;
      const pectraTotal = pectraTotalRewards - pectraTotalFees;

      if (pectraClApr > standardClApr && pectraTotalRewards <= standardTotalRewards) {
        const adjustmentFactor = pectraClApr / standardClApr;
        pectraTotalRewards = standardTotalRewards * adjustmentFactor;
      }

      setResults({
        optimalStake,
        numValidators,
        remainingEth,
        hasExtra,
        standardClApr,
        pectraClApr,
        standardTotal,
        pectraTotal,
        standardTotalRewards,
        pectraTotalRewards,
        standardTotalFees,
        pectraTotalFees,
        standardYearlyRewards,
        pectraYearlyRewards,
        standardInitialValidators: currentValidators,
        standardFinalValidators: currentValidators,
        standardInitialStake,
        pectraInitialStake,
        validatorBalances,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while calculating results");
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1rem" }}>
      {/* Header */}
      <div style={{ padding: "2rem", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: "0.75rem", color: "white", textShadow: "0 2px 4px rgba(0, 0, 0, 0.3)" }}>
          Validator Stake Optimizer
        </h1>
        <p style={{ color: "white", fontSize: "1.1rem", lineHeight: "1.5", textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)" }}>
          Optimize your validator deployment strategy and maximize staking returns.
        </p>
      </div>

      {/* Input Section */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", marginBottom: "2rem", alignItems: "stretch" }}>
        <Card className="card" style={{ padding: "1.5rem", background: "linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85))", backdropFilter: "blur(10px)", border: "1px solid rgba(255, 255, 255, 0.2)", boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", flex: 1 }}>
            <div>
              <Label htmlFor="totalEth" style={{ display: "block", marginBottom: "0.75rem", fontSize: "0.95rem", fontWeight: "500", position: "relative", cursor: "help" }} title="The total amount of ETH you want to stake.">
                Total Available ETH
              </Label>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <Input id="totalEth" type="number" value={totalEth} onChange={(e) => setTotalEth(Number(e.target.value))} className="input" style={{ width: "120px" }} />
                <input type="range" min="32" max="1000000" step="100" value={totalEth} onChange={(e) => setTotalEth(Number(e.target.value))} style={{ flex: 1, height: "6px", borderRadius: "3px", background: "var(--border)", outline: "none", WebkitAppearance: "none" }} />
              </div>
              <p style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.5rem" }}>
                Enter the total amount of ETH you want to stake.
              </p>
            </div>

            <div>
              <Label htmlFor="networkApr" style={{ display: "block", marginBottom: "0.75rem", fontSize: "0.95rem", fontWeight: "500", position: "relative", cursor: "help" }} title="The expected APR for staking rewards.">
                Network APR (%)
              </Label>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <Input id="networkApr" type="number" value={networkApr} onChange={(e) => setNetworkApr(Number(e.target.value))} className="input" style={{ width: "120px" }} step="0.01" />
                <input type="range" min="1" max="6" step="0.01" value={networkApr} onChange={(e) => setNetworkApr(Number(e.target.value))} style={{ flex: 1, height: "6px", borderRadius: "3px", background: "var(--border)", outline: "none", WebkitAppearance: "none" }} />
              </div>
              <p style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.5rem" }}>
                The expected APR for staking rewards.
              </p>
            </div>

            <div>
              <Label htmlFor="years" style={{ display: "block", marginBottom: "0.75rem", fontSize: "0.95rem", fontWeight: "500", position: "relative", cursor: "help" }} title="The number of years to project staking rewards.">
                Stake Duration (Years)
              </Label>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <Input id="years" type="number" value={years} onChange={(e) => setYears(Number(e.target.value))} className="input" style={{ width: "120px" }} />
                <input type="range" min="1" max="5" step="1" value={years} onChange={(e) => setYears(Number(e.target.value))} style={{ flex: 1, height: "6px", borderRadius: "3px", background: "var(--border)", outline: "none", WebkitAppearance: "none" }} />
              </div>
              <p style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.5rem" }}>
                How many years you plan to stake.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Results Section */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", marginBottom: "2rem", alignItems: "stretch" }}>
        <Card className="card" style={{ padding: "1.5rem", background: "linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85))", backdropFilter: "blur(10px)", border: "1px solid rgba(255, 255, 255, 0.2)", boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", flex: 1 }}>
            <div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem" }}>
                Optimal Distribution Strategy
              </h3>
              {results ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  <div>
                    <h4 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.75rem", color: "#4C4C4C" }}>
                      Validator Composition
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#4C4C4C" }}>Standard Method:</span>
                        <span style={{ fontWeight: "500" }}>{Math.floor(totalEth / 32)} × 32.00 ETH</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#4C4C4C" }}>Optimized Method:</span>
                        <span style={{ fontWeight: "500", color: "var(--primary)" }}>
                          {results.numValidators} × {results.optimalStake.toFixed(2)} ETH
                          {results.hasExtra && ` + 1 × ${results.remainingEth.toFixed(2)} ETH`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.75rem", color: "#4C4C4C" }}>
                      Consensus Layer APR% Comparison
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#4C4C4C" }}>Standard Method:</span>
                        <span style={{ fontWeight: "500" }}>{results.standardClApr.toFixed(3)}% ({results.standardTotalRewards.toFixed(2)} ETH)</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#4C4C4C" }}>Optimized Method:</span>
                        <span style={{ fontWeight: "500", color: "var(--primary)" }}>
                          {results.pectraClApr.toFixed(3)}% ({results.pectraTotalRewards.toFixed(2)} ETH)
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
                        <span style={{ color: "#4C4C4C", fontWeight: "500" }}>Additional:</span>
                        <span style={{ fontWeight: "600", color: "var(--primary)" }}>
                          +{(results.pectraClApr - results.standardClApr).toFixed(3)}% (+{(results.pectraTotalRewards - results.standardTotalRewards).toFixed(2)} ETH)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ color: "#4C4C4C" }}>Enter your parameters and click calculate to see results.</p>
              )}
            </div>
            <div style={{ backgroundColor: "rgba(81, 100, 220, 0.1)", padding: "1rem", borderRadius: "6px", textAlign: "center" }}>
              <p style={{ color: "var(--primary)", fontSize: "0.875rem", margin: 0 }}>
                Loads your validators as close to the cap as possible, optimizing autocompounding for quicker rewards—without exceeding MaxEB until the time horizon has completed
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* About Section */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem", alignItems: "start" }}>
        <Card className="card" style={{ padding: "1.5rem", background: isAboutExpanded ? "linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85))" : "linear-gradient(135deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.6))", backdropFilter: "blur(10px)", border: "1px solid rgba(255, 255, 255, 0.2)", boxShadow: isAboutExpanded ? "0 8px 32px rgba(0, 0, 0, 0.1)" : "0 4px 16px rgba(0, 0, 0, 0.05)", transition: "all 0.3s ease", cursor: "pointer", height: "fit-content" }}>
          <div onClick={() => setIsAboutExpanded(!isAboutExpanded)} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"} style={{ transition: "all 0.2s ease" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isAboutExpanded ? "1.5rem" : "0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "3px", height: "24px", background: "linear-gradient(to bottom, #3b82f6, #60a5fa)", borderRadius: "2px" }} />
                <h3 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#1a1a1a", margin: 0, opacity: isAboutExpanded ? 1 : 0.8 }}>
                  About Pectra
                </h3>
              </div>
              <div style={{ transform: isAboutExpanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.3s ease", color: "#3b82f6", fontSize: "0.75rem", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", backgroundColor: "rgba(59, 130, 246, 0.1)", opacity: isAboutExpanded ? 1 : 0.6 }}>
                ▼
              </div>
            </div>
            <div style={{ maxHeight: isAboutExpanded ? "1000px" : "0", overflow: "hidden", transition: "all 0.3s ease-out", opacity: isAboutExpanded ? 1 : 0 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ padding: "1rem", background: "rgba(59, 130, 246, 0.05)", borderRadius: "8px", border: "1px solid rgba(59, 130, 246, 0.1)" }}>
                  <p style={{ margin: 0, color: "#4C4C4C", fontSize: "0.95rem", lineHeight: "1.6" }}>
                    Advanced Ethereum staking protocol revolutionizing validator management through automated reward reinvestment and optimized allocation strategies.
                  </p>
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <li style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", color: "#4C4C4C", fontSize: "0.95rem", lineHeight: "1.6" }}>
                    <span style={{ width: "6px", height: "6px", background: "#3b82f6", borderRadius: "50%", marginTop: "0.5rem" }} />
                    Eliminates manual restaking processes to reduce operational overhead
                  </li>
                  <li style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", color: "#4C4C4C", fontSize: "0.95rem", lineHeight: "1.6" }}>
                    <span style={{ width: "6px", height: "6px", background: "#3b82f6", borderRadius: "50%", marginTop: "0.5rem" }} />
                    Automatically reinvests rewards to maximize compounding returns
                  </li>
                  <li style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", color: "#4C4C4C", fontSize: "0.95rem", lineHeight: "1.6" }}>
                    <span style={{ width: "6px", height: "6px", background: "#3b82f6", borderRadius: "50%", marginTop: "0.5rem" }} />
                    Optimizes validator allocation for enhanced staking efficiency
                  </li>
                  <li style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", color: "#4C4C4C", fontSize: "0.95rem", lineHeight: "1.6" }}>
                    <span style={{ width: "6px", height: "6px", background: "#3b82f6", borderRadius: "50%", marginTop: "0.5rem" }} />
                    Delivers significant returns through long-term compounding effects
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default ValidatorOptimizer;
