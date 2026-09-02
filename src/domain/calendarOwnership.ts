export type OwnableBlock = {
  ownedByApp: boolean;
  mirrored: boolean;
};

export function agentMayModify(block: OwnableBlock): boolean {
  return block.ownedByApp && !block.mirrored;
}
