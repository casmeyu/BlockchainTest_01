const { expect } = require("chai");
const { ethers } = require("hardhat");
describe("Signatures", function () {
    let signer; let bob; let steve;
    before(async function() {
        [signer, bob, steve] = await ethers.getSigners();
        const signatureFactory = await ethers.getContractFactory("Signature");
        this.signatureContract = await signatureFactory.deploy();
        await this.signatureContract.deployed();
    })
    it("Get Message Hash", async function () {
        const to = bob.address;
        const amount = 100;
        const message = "Hello World";
        const nonce = 32;
        const messageHash = await this.signatureContract.connect(signer).getMessageHash(to, amount, message, nonce);
        // console.log("Message Hash: ", messageHash);
        expect(messageHash.length).to.equal(66);
    })
    it("Get Signature", async function () {
        const to = bob.address;
        const amount = 100;
        const message = "Hello World";
        const nonce = 32;
        const messageHash = await this.signatureContract.connect(signer).getMessageHash(to, amount, message, nonce);
        // console.log("Message Hash: ", messageHash);
        const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));
        // console.log("Signature: ", signature);
        expect(signature.length).to.equal(132);
    })
    it("Verify signer", async function () {
        const to = bob.address;
        const amount = 100;
        const message = "Hello World";
        const nonce = 32;
        const messageHash = await this.signatureContract.connect(signer).getMessageHash(to, amount, message, nonce);
        // console.log("Message Hash: ", messageHash);
        const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));
        // console.log("Signature: ", signature);
        const verifySigner = await this.signatureContract.connect(signer).verify(signer.address, to, amount, message, nonce, signature);
        // console.log("Verify Signer: ", verifySigner);
        expect(verifySigner).to.equal(true);
    });
    it("Recover Signer", async function(){
        const to = bob.address;
        const amount = 100;
        const message = "Hello World";
        const nonce = 32;
        const messageHash = await this.signatureContract.connect(signer).getMessageHash(to, amount, message, nonce);
        // console.log("Message Hash: ", messageHash);
        const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));
        // console.log("Signature: ", signature);
        const ethSignedMessageHash = await this.signatureContract.connect(signer).getEthSignedMessageHash(messageHash);
        const recoverSigner = await this.signatureContract.connect(signer).recoverSigner(ethSignedMessageHash, signature);
        // console.log("Recover Signer: ", recoverSigner);
        // console.log("Signer: ", signer.address);
        expect(recoverSigner).to.equal(signer.address);
    })
    it("Length of signature must be 65", async function(){
        const to = bob.address;
        const amount = 100;
        const message = "Hello World";
        const nonce = 32;
        const messageHash = await this.signatureContract.connect(signer).getMessageHash(to, amount, message, nonce);
        // console.log("Message Hash: ", messageHash);
        const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));
        // console.log("Signature: ", signature);
        const ethSignedMessageHash = await this.signatureContract.connect(signer).getEthSignedMessageHash(messageHash);
        await expect(this.signatureContract.connect(signer).recoverSigner(ethSignedMessageHash, ethSignedMessageHash)).to.be.revertedWith("invalid signature length");
    });
})
// const {
//     time,
//     loadFixture,
//   } = require("@nomicfoundation/hardhat-network-helpers");
// const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
// const { expect } = require("chai");
// const { ethers } = require("hardhat");



// describe('Signature', async () => {
//     it ('Verify', async () => {
//         const [owner, alice, bob] = await ethers.getSigners();
//         const SignatureFactory = await ethers.getContractFactory('Signature');
//         const Signature = await SignatureFactory.deploy();
//         await Signature.deployed();

//         const message = "hola bob";
//         const amount = 50;
//         const nounce = 10;
//         const messageHash = await Signature.connect(alice).getMessageHash(bob.address, amount, message, nounce);
//         const ethSignedMessageHash = await Signature.connect(alice).getEthSignedMessageHash(messageHash);
        
//         // console.log(`messageHash: ${messageHash}`);
//         // console.log(`ethSignedMessageHash: ${ethSignedMessageHash}\n`);

//         const signature = await alice.signMessage(ethers.utils.arrayify(messageHash));
//         // console.log(`signed message: ${signature}\n`);

//         console.log('Recover');
//         const signer = await Signature.recoverSigner(ethSignedMessageHash, signature);
        
//         console.log(`alice address: ${alice.address}`);
//         console.log(`recovered address: ${signer}`);
        
//         const ver = await Signature.verify(alice.address, bob.address, amount, message, nounce, signature);
//         expect(ver).to.equal(true);
//     })
    
// });