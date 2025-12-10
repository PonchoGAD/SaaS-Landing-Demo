"use client"

import { useAccount, useConnect, useDisconnect } from "wagmi"
import { InjectedConnector } from "wagmi/connectors/injected"

export default function Home() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect({ connector: new InjectedConnector() })
  const { disconnect } = useDisconnect()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      {!isConnected && (
        <button 
          onClick={() => connect()} 
          className="px-6 py-3 border rounded-lg text-lg"
        >Connect Wallet</button>
      )}

      {isConnected && (
        <>
          <p className="text-lg">Connected: {address}</p>
          <button 
            className="px-6 py-3 border rounded-lg"
            onClick={() => disconnect()}
          >Disconnect</button>

          <button 
            onClick={() => alert("Mint function will be here")}
            className="px-6 py-3 bg-black text-white rounded-lg"
          >Mint NFT</button>
        </>
      )}
    </main>
  )
}
