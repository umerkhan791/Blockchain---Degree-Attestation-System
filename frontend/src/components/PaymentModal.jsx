/**
 * PaymentModal.jsx
 * Handles MetaMask payment on Sepolia + Demo Mode for presentations.
 */

import { useState } from 'react'

const UNIVERSITY_WALLET = import.meta.env.VITE_UNIVERSITY_WALLET || '0x8c5cb60209dEd2E7Fc8d5db839C6DfA6D3A07EEe'
const SEPOLIA_CHAIN_ID  = '0xaa36a7'
const FEE_ETH           = '0.001'
const FEE_WEI           = '0x38D7EA4C68000'

const STEPS = {
  IDLE:        'idle',
  CONNECTING:  'connecting',
  SWITCHING:   'switching',
  PAYING:      'paying',
  CONFIRMING:  'confirming',
  DONE:        'done',
  ERROR:       'error',
  DEMO:        'demo',
}

// Fake tx hash for demo mode
const DEMO_TX = '0xdemo' + Math.random().toString(16).slice(2, 12) + 'a3f9b2c8d1e4f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2'
const DEMO_WALLET = '0xDem0Student7F3a9B2c8D1E4F7A6B5C4D3E2F1A0B9'

export default function PaymentModal({ onSuccess, onClose }) {
  const [step,   setStep]   = useState(STEPS.IDLE)
  const [error,  setError]  = useState('')
  const [txHash, setTxHash] = useState('')
  const [wallet, setWallet] = useState('')

  const reset = () => { setStep(STEPS.IDLE); setError('') }

  // ── Demo Mode ─────────────────────────────────────────────────
  const handleDemo = async () => {
    setStep(STEPS.DEMO)
    // Simulate delay like real payment
    await new Promise(r => setTimeout(r, 1500))
    setTxHash(DEMO_TX)
    setWallet(DEMO_WALLET)
    setStep(STEPS.DONE)
    onSuccess(DEMO_TX, DEMO_WALLET)
  }

  // ── Real MetaMask payment ──────────────────────────────────────
  const handlePay = async () => {
    setError('')

    if (!window.ethereum) {
      setError('MetaMask is not installed. Use Demo Mode below for presentation.')
      setStep(STEPS.ERROR)
      return
    }

    try {
      setStep(STEPS.CONNECTING)
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const account  = accounts[0]
      setWallet(account)

      setStep(STEPS.SWITCHING)
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      if (chainId !== SEPOLIA_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
          })
        } catch (switchErr) {
          if (switchErr.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: SEPOLIA_CHAIN_ID,
                chainName: 'Sepolia Testnet',
                nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://rpc.sepolia.org'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              }],
            })
          } else throw switchErr
        }
      }

      setStep(STEPS.PAYING)
      const tx = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: account, to: UNIVERSITY_WALLET, value: FEE_WEI, gas: '0x5208' }],
      })
      setTxHash(tx)

      setStep(STEPS.CONFIRMING)
      await waitForReceipt(tx)

      setStep(STEPS.DONE)
      onSuccess(tx, account)

    } catch (err) {
      if (err.code === 4001) {
        setError('Payment cancelled. You rejected the transaction.')
      } else {
        setError(err.message || 'Payment failed. Please try again or use Demo Mode.')
      }
      setStep(STEPS.ERROR)
    }
  }

  const waitForReceipt = (hash) => new Promise((resolve, reject) => {
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      try {
        const receipt = await window.ethereum.request({
          method: 'eth_getTransactionReceipt',
          params: [hash],
        })
        if (receipt) { clearInterval(interval); resolve(receipt) }
      } catch (e) {}
      if (attempts > 60) { clearInterval(interval); reject(new Error('Timeout')) }
    }, 5000)
  })

  // ── Styles ─────────────────────────────────────────────────────
  const overlay = {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
    zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
  }
  const modal = {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: '2rem',
    maxWidth: '420px', width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
  }

  const busy = [STEPS.CONNECTING, STEPS.SWITCHING, STEPS.PAYING, STEPS.CONFIRMING, STEPS.DEMO].includes(step)

  const stepLabel = {
    [STEPS.CONNECTING]:  'Connecting MetaMask…',
    [STEPS.SWITCHING]:   'Switching to Sepolia network…',
    [STEPS.PAYING]:      'Confirm payment in MetaMask…',
    [STEPS.CONFIRMING]:  'Waiting for blockchain confirmation…',
    [STEPS.DEMO]:        'Simulating payment on Sepolia…',
    [STEPS.DONE]:        'Payment confirmed! ✅',
  }[step]

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <div style={modal}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
          <div style={{
            width: 44, height: 44, flexShrink: 0,
            background: 'linear-gradient(135deg, #f97316, #fb923c)',
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
          }}>🦊</div>
          <div>
            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Degree Application Fee</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              Pay with MetaMask on Sepolia Testnet
            </p>
          </div>
        </div>

        {/* Fee box */}
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '1rem 1.25rem', marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Application fee</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{FEE_ETH} ETH</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Network</span>
            <span style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>Sepolia Testnet</span>
          </div>
          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            💡 If your application is rejected, <strong style={{ color: 'var(--cyan)' }}>the fee is automatically refunded</strong> to your wallet.
          </div>
        </div>

        {/* Status */}
        {stepLabel && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: step === STEPS.DONE ? 'rgba(74,222,128,0.08)' : 'var(--cyan-dim)',
            border: `1px solid ${step === STEPS.DONE ? 'rgba(74,222,128,0.25)' : 'var(--cyan-mid)'}`,
            borderRadius: 'var(--radius-sm)', padding: '10px 14px',
            marginBottom: '1.25rem', fontSize: '0.85rem',
            color: step === STEPS.DONE ? '#4ade80' : 'var(--cyan)',
          }}>
            {busy && (
              <div style={{
                width: 16, height: 16, flexShrink: 0,
                border: '2px solid currentColor', borderTopColor: 'transparent',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
              }} />
            )}
            {stepLabel}
          </div>
        )}

        {/* Error */}
        {step === STEPS.ERROR && (
          <div style={{
            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: 'var(--radius-sm)', padding: '10px 14px',
            marginBottom: '1.25rem', fontSize: '0.85rem', color: '#f87171',
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: step === STEPS.IDLE || step === STEPS.ERROR ? '12px' : 0 }}>
          {step !== STEPS.DONE && (
            <button className="btn btn-secondary" onClick={onClose} disabled={busy} style={{ flex: 1 }}>
              Cancel
            </button>
          )}
          {step === STEPS.IDLE && (
            <button className="btn btn-primary" onClick={handlePay} style={{ flex: 2 }}>
              🦊 Pay {FEE_ETH} ETH
            </button>
          )}
          {step === STEPS.ERROR && (
            <button className="btn btn-primary" onClick={reset} style={{ flex: 2 }}>
              Try Again
            </button>
          )}
          {step === STEPS.DONE && (
            <button className="btn btn-primary" onClick={onClose} style={{ flex: 1 }}>
              Continue →
            </button>
          )}
        </div>

        {/* Demo Mode button — shown on IDLE and ERROR */}
        {(step === STEPS.IDLE || step === STEPS.ERROR) && (
          <button
            onClick={handleDemo}
            disabled={busy}
            style={{
              width: '100%', padding: '10px',
              background: 'transparent',
              border: '1px dashed rgba(167,139,250,0.4)',
              borderRadius: 'var(--radius-sm)',
              color: '#a78bfa', fontSize: '0.82rem',
              cursor: 'pointer', fontFamily: 'var(--font-display)',
              fontWeight: 600, letterSpacing: '0.03em',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(167,139,250,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            🎓 Demo Mode — Simulate Payment (for presentation)
          </button>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}
