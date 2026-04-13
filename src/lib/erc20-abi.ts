export const ERC20_ABI = [
  {
    "name": "transfer",
    "type": "function",
    "inputs": [
      {
        "name": "recipient",
        "type": "felt"
      },
      {
        "name": "amount",
        "type": "Uint256"
      }
    ],
    "outputs": [
      {
        "name": "success",
        "type": "felt"
      }
    ]
  },
  {
    "name": "balanceOf",
    "type": "function",
    "inputs": [
      {
        "name": "account",
        "type": "felt"
      }
    ],
    "outputs": [
      {
        "name": "balance",
        "type": "Uint256"
      }
    ]
  },
  {
    "name": "allowance",
    "type": "function",
    "inputs": [
      {
        "name": "owner",
        "type": "felt"
      },
      {
        "name": "spender",
        "type": "felt"
      }
    ],
    "outputs": [
      {
        "name": "remaining",
        "type": "Uint256"
      }
    ]
  }
] as const;
