/**
 * PaymentModal.jsx
 * Handles MetaMask connection, ETH payment on Sepolia, and refunds.
 *
 * Props:
 *   onSuccess(txHash, walletAddress) — called when payment confirmed
 *   onClose()                        — called when user dismisses
 */

import { useState } from 'react'

const SEPOLIA_CHAIN_ID    = '0xaa36a7'          // 11155111 in hex
const UNIVERSITY_WALLET   = import.meta.env.VITE_UNIVERSITY_WALLET || '0x8c5cb60209dEd2E7Fc8d5db839C6DfA6D3A07EEe'
const FEE_ETH             = '0.001'             // fee in ETH
const FEE_WEI             = '0x38D7EA4C68000'   // 0.001 ETH in wei (hex)

const STEPS = {
  IDLE:        'idle',
  CONNECTING:  'connecting',
  SWITCHING:   'switching',
  PAYING:      'paying',
  CONFIRMING:  'confirming',
  DONE:        'done',
  ERROR:       'error',
}

export default function PaymentModal({ onSuccess, onClose }) {
  const [step,    setStep]    = useState(STEPS.IDLE)
  const [error,   setError]   = useState('')
  const [txHash,  setTxHash]  = useState('')
  const [wallet,  setWallet]  = useState('')

  const reset = () => { setStep(STEPS.IDLE); setError('') }

  const handlePay = async () => {
    setError('')

    // ── 1. Check MetaMask installed ───────────────────────────────
    if (!window.ethereum) {
      setError('MetaMask is not installed. Please install it from metamask.io')
      setStep(STEPS.ERROR)
      return
    }

    try {
      // ── 2. Connect wallet ─────────────────────────────────────
      setStep(STEPS.CONNECTING)
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const account  = accounts[0]
      setWallet(account)

      // ── 3. Switch to Sepolia if needed ─────────────────────────
      setStep(STEPS.SWITCHING)
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      if (chainId !== SEPOLIA_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
          })
        } catch (switchErr) {
          // Chain not added — add it
          if (switchErr.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId:         SEPOLIA_CHAIN_ID,
                chainName:       'Sepolia Testnet',
                nativeCurrency:  { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
                rpcUrls:         ['https://rpc.sepolia.org'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              }],
            })
          } else {
            throw switchErr
          }
        }
      }

      // ── 4. Send payment ────────────────────────────────────────
      setStep(STEPS.PAYING)
      const tx = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from:  account,
          to:    UNIVERSITY_WALLET,
          value: FEE_WEI,
          gas:   '0x5208',   // 21000 standard transfer
        }],
      })
      setTxHash(tx)

      // ── 5. Wait for confirmation ───────────────────────────────
      setStep(STEPS.CONFIRMING)
      await waitForReceipt(tx)

      // ── 6. Done ────────────────────────────────────────────────
      setStep(STEPS.DONE)
      onSuccess(tx, account)

    } catch (err) {
      if (err.code === 4001) {
        setError('Payment cancelled. You rejected the transaction.')
      } else {
        setError(err.message || 'Payment failed. Please try again.')
      }
      setStep(STEPS.ERROR)
    }
  }

  // Poll for tx receipt (Sepolia can take ~15s)
  const waitForReceipt = (hash) => new Promise((resolve, reject) => {
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      try {
        const receipt = await window.ethereum.request({
          method: 'eth_getTransactionReceipt',
          params: [hash],
        })
        if (receipt) {
          clearInterval(interval)
          resolve(receipt)
        }
      } catch (e) { /* keep polling */ }
      if (attempts > 60) {   // 60 × 5s = 5 min timeout
        clearInterval(interval)
        reject(new Error('Transaction timed out. Please check Etherscan.'))
      }
    }, 5000)
  })

  // ── UI ─────────────────────────────────────────────────────────

  const overlay = {
    position:       'fixed',
    inset:          0,
    background:     'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(6px)',
    zIndex:         1000,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        '1rem',
  }

  const modal = {
    background:   'var(--bg-card)',
    border:       '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding:      '2rem',
    maxWidth:     '420px',
    width:        '100%',
    boxShadow:    '0 24px 80px rgba(0,0,0,0.5)',
  }

  const stepLabel = {
    [STEPS.IDLE]:       null,
    [STEPS.CONNECTING]: 'Connecting MetaMask…',
    [STEPS.SWITCHING]:  'Switching to Sepolia network…',
    [STEPS.PAYING]:     'Confirm payment in MetaMask…',
    [STEPS.CONFIRMING]: 'Waiting for blockchain confirmation…',
    [STEPS.DONE]:       'Payment confirmed! ✅',
    [STEPS.ERROR]:      null,
  }[step]

  const busy = [STEPS.CONNECTING, STEPS.SWITCHING, STEPS.PAYING, STEPS.CONFIRMING].includes(step)

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <div style={modal}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
          <div style={{
            width: 44, height: 44,
            background: 'linear-gradient(135deg, #f97316, #fb923c)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.4rem', flexShrink: 0,
          }}>🦊</div>
          <div>
            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Degree Application Fee</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              Pay with MetaMask on Sepolia Testnet
            </p>
          </div>
        </div>

        {/* Fee breakdown */}
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Application fee</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>{FEE_ETH} ETH</span>
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
            background: 'var(--cyan-dim)',
            border: '1px solid var(--cyan-mid)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            color: 'var(--cyan)',
          }}>
            {busy && (
              <div style={{
                width: 16, height: 16, flexShrink: 0,
                border: '2px solid var(--cyan)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
            )}
            {stepLabel}
          </div>
        )}

        {/* Error */}
        {step === STEPS.ERROR && (
          <div style={{
            background: 'rgba(248,113,113,0.1)',
            border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            color: '#f87171',
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Tx hash after payment */}
        {txHash && step !== STEPS.ERROR && (
          <div style={{ marginBottom: '1.25rem' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>TRANSACTION HASH</p>
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank" rel="noreferrer"
              style={{
                display: 'block',
                fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                color: 'var(--cyan)', wordBreak: 'break-all',
                textDecoration: 'none',
              }}
            >
              {txHash}
            </a>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {step !== STEPS.DONE && (
            <button
              className="btn btn-secondary"
              onClick={onClose}
              disabled={busy}
              style={{ flex: 1 }}
            >
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

        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}
