import { ethers } from "hardhat"
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { StaticRaffle, VRFCoordinatorV2Mock } from "../typechain-types";
import { BytesLike, parseEther } from 'ethers/lib/utils'
import { ContractTransaction, ContractReceipt } from 'ethers';
import { assert } from 'chai';

describe(`Static Raffle test scenario with seven winners`, async function () {
    async function deployStaticRaffleFixture() {
        const [deployer] = await ethers.getSigners(); // mock wallets

        /**
         * @dev Read more at https://docs.chain.link/docs/chainlink-vrf/
         */
        const BASE_FEE = "1000000000000000000"; // 1 LINK
        const GAS_PRICE_LINK = "1000000000"; // 0.000000001 LINK per gas

        const vrfCoordinatorFactory = await ethers.getContractFactory("VRFCoordinatorV2Mock");
        const mockVrfCoordinator: VRFCoordinatorV2Mock = await vrfCoordinatorFactory.deploy(BASE_FEE, GAS_PRICE_LINK);

        const tx: ContractTransaction = await mockVrfCoordinator.createSubscription();
        const txReceipt: ContractReceipt = await tx.wait(1);
        if (!txReceipt.events) return;
        const subscriptionId = ethers.BigNumber.from(txReceipt.events[0].topics[1]);

        // grab from the docs (use the one for Goerli testnet)
        const keyHash = `0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15`;
        const callbackGasLimit = 2500000;
        const requestConfirmations = 5;
        const numWords = 7; // we are looking for 7 winners

        const mockParticipants: BytesLike[] = [
            `0x3ac225168df54212a25c1c01fd35bebfea408fdac2e31ddd6f80a4bbf9a5f1cb`,
            `0xb5553de315e0edf504d9150af82dafa5c4667fa618ed0a6f19c69b41166c5510`,
            `0x0b42b6393c1f53060fe3ddbfcd7aadcca894465a5a438f69c87d790b2299b9b2`,
            `0xf1918e8562236eb17adc8502332f4c9c82bc14e19bfc0aa10ab674ff75b3d2f3`,
            `0xa8982c89d80987fb9a510e25981ee9170206be21af3c8e0eb312ef1d3382e761`,
            `0xd1e8aeb79500496ef3dc2e57ba746a8315d048b7a664a2bf948db4fa91960483`,
            `0x14bcc435f49d130d189737f9762feb25c44ef5b886bef833e31a702af6be4748`,
            `0xa766932420cc6e9072394bef2c036ad8972c44696fee29397bd5e2c06001f615`,
            `0xea00237ef11bd9615a3b6d2629f2c6259d67b19bb94947a1bd739bae3415141c`,
            `0xb31d742db54d6961c6b346af2c9c4c495eb8aff2ebf6b3699e052d1cef5cf50b`
        ]

        const staticRaffleFactory = await ethers.getContractFactory("StaticRaffle");
        const staticRaffle: StaticRaffle = await staticRaffleFactory.deploy(
            mockParticipants,
            subscriptionId,
            mockVrfCoordinator.address,
            keyHash,
            callbackGasLimit,
            requestConfirmations,
            numWords
        )

        mockVrfCoordinator.fundSubscription(subscriptionId, parseEther("5"));
        mockVrfCoordinator.addConsumer(subscriptionId, staticRaffle.address);

        return { staticRaffle, deployer, mockVrfCoordinator, numWords }
    }

    describe(`Running raffle scenario`, async function () {
        it(`should run raffle and determine seven winners only once`, async function () {
            const fixture = await loadFixture(deployStaticRaffleFixture);
            if (!fixture) return;

            const tx: ContractTransaction = await fixture.staticRaffle.connect(fixture.deployer).runRaffle();
            const txReceipt: ContractReceipt = await tx.wait(1);
            if (!txReceipt.events) return;
            if (!txReceipt.events[1].args) return;
            const requestId = txReceipt.events[1].args[0];

            // mock the callback from chainlink vrf
            await fixture.mockVrfCoordinator.fulfillRandomWords(requestId, fixture.staticRaffle.address);
            const winners = await fixture.staticRaffle.getWinners();

            assert(winners.length === fixture.numWords, "Invalid winners number");
        })
    })
})