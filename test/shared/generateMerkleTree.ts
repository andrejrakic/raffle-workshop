import { keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { MerkleTree } from "merkletreejs";

export async function generateMerkleTree(ticketNumbers: string[]) {
    const leaves = ticketNumbers.map((ticketNumber) => keccak256(toUtf8Bytes(ticketNumber)));
    const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const merkleRoot = merkleTree.getHexRoot();

    const ticketConfirmationNumber = "AAA123";
    const hashedTicketConfirmationNumber = keccak256(toUtf8Bytes(ticketConfirmationNumber));
    const proof = merkleTree.getHexProof(hashedTicketConfirmationNumber);

    return { merkleRoot, merkleTree }
}