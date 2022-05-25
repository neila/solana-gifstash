import React, { useEffect, useState } from 'react';
import twitterLogo from './assets/twitter-logo.svg';
import cohurinQR from './assets/twitter-qr.jpeg'
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
import idl from './idl.json';
import kp from './keypair.json';
import './App.css';

// SystemProgram is a reference to the Solana runtime
const { SystemProgram, Keypair } = web3;

// Create a keypair for the account that will hold the GIF data
const secret = new Uint8Array(Object.values(kp._keypair.secretKey))
const baseAccount = web3.Keypair.fromSecretKey(secret)

// Get our program's id from the IDL file
const programID = new PublicKey(idl.metadata.address);

// Set our network to devnet
const network = clusterApiUrl('devnet');

// Controls how we want to acknowledge when a transaction is "done"
const opts = {
    preflightCommitment: "processed"
}


const TEST_GIFS = [
	'https://i.giphy.com/media/eIG0HfouRQJQr1wBzz/giphy.webp',
	'https://media3.giphy.com/media/L71a8LW2UrKwPaWNYM/giphy.gif?cid=ecf05e47rr9qizx2msjucl1xyvuu47d7kf25tqt2lvo024uo&rid=giphy.gif&ct=g',
	'https://media4.giphy.com/media/AeFmQjHMtEySooOc8K/giphy.gif?cid=ecf05e47qdzhdma2y3ugn32lkgi972z9mpfzocjj6z1ro4ec&rid=giphy.gif&ct=g',
	'https://i.giphy.com/media/PAqjdPkJLDsmBRSYUp/giphy.webp'
]

const TWITTER_HANDLE = 'shofosho';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const App = () => {

    const [walletAddress, setWalletAddress] = useState(null);
    const [inputValue, setInputValue] = useState('');
    const [gifList, setGifList] = useState([]);


    const checkIfWalletIsConnected = async () => {
        try {
            const { solana } = window;
            if (solana) {
                if (solana.isPhantom) {
                    console.log('Phantom wallet found!');
                    const response = await solana.connect({ onlyIfTrusted: true });
                    console.log('Connected with Public Key:', response.publicKey.toString());
                    setWalletAddress(response.publicKey.toString());
                }
            } else {
                alert('Solana object not found! Get a Phantom Wallet 👻');
            }
            
        } catch (error) {
            console.error(error);
        }
    };

    const connectWallet = async () => {
        const { solana } = window;

        if (solana) {
            const response = await solana.connect();
            console.log('Connected with Public Key:', response.publicKey.toString());
            setWalletAddress(response.publicKey.toString());
        }
    };

    const onInputChange = (e) => {
        const { value } = e.target;
        setInputValue(value);
    };

    const getProvider = () => {
        const connection = new Connection(network, opts.preflightCommitment);
        const provider = new Provider(
            connection, window.solana, opts.preflightCommitment,
        );
        return provider;
    }

    const createGifAccount = async () => {
        try {
            const provider = getProvider();
            const program = new Program(idl, programID, provider);
            console.log("pinging...")
            await program.rpc.startStuffOff({
                accounts: {
                    baseAccount: baseAccount.publicKey,
                    user: provider.wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                },
                signers: [baseAccount]
            });
            console.log("Created a new BaseAccount w/ address:", baseAccount.publicKey.toString())
            await getGifList();
      
        } catch(error) {
            console.log("Error creating BaseAccount account:", error)
        }
    }

    const getGifList = async() => {
        try {
            const provider = getProvider();
            const program = new Program(idl, programID, provider);
            const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
            
            console.log("Got the account", account)
            // set state with the list of GIFs
            setGifList(account.gifList)
        } catch (error) {
            console.log("Error in getGifList: ", error)
            // set state to null
            setGifList(null);
        }
    }
      

    const sendGif = async () => {
        if (inputValue.length === 0) {
            console.log("No gif link given!")
            return
        }
        console.log('Gif link:', inputValue);
        try {
            const provider = getProvider();
            const program = new Program(idl, programID, provider);
        
            await program.rpc.addGif(inputValue, {
                accounts: {
                    baseAccount: baseAccount.publicKey,
                    user: provider.wallet.publicKey,
                },
            });
            console.log("GIF successfully sent to program", inputValue)
      
            await getGifList();
        } catch (error) {
            console.log("Error sending GIF:", error)
        }
    };

    const renderNotConnectedContainer = () => (
        <button className="cta-button connect-wallet-button" onClick={connectWallet}> 
            Connect to Wallet
        </button>
    );

    const renderConnectedContainer = () => {
        if (gifList === null){
            return (
                <div className="connected-container">
                    <p className="header">Hey there! Seems like this is your first time here.</p> <br />
                    <p className="sub-text">This application needs you to initialize a <a href='https://docs.solana.com/developing/programming-model/accounts'><em>solana account</em></a> which allows your wallet to interact with the smart contract.</p>
                    <p className="sub-text">You will be prompted to pay a small amount of SOL, which is collected as <a href='https://docs.solana.com/implemented-proposals/rent'><em>rent</em></a> by the validators to keep your account on the Solana network.</p>
                    <p className="sub-text">At this time, the contract is on the Solana devnet, which is run on fake SOL. You can request fake SOL to your phantom account for free, using the command below (make sure your phantom wallet is connected to devnet).</p>
                    <pre><code>solana airdrop 5 YOUR_PHANTOM_PUBLIC_ADDRESS  --url https://api.devnet.solana.com</code></pre>
                    <br /><br />
                    <button className="cta-button submit-gif-button" onClick={createGifAccount}>
                        initialize solana account (once per phantom wallet)
                    </button>
                </div>
            )
        } else { 
            return (
                <div className="connected-container">
                    <form onSubmit={(event) => {event.preventDefault();sendGif();}}>
                        <input type="text" placeholder="Enter gif link!" value={inputValue} onChange={onInputChange}/>
                        <button type="submit" className="cta-button submit-gif-button">Submit</button>
                    </form>
                    <div className="gif-grid">
                        {gifList.map((item, index) => ( 
                            item.gifLink.slice(-4) === '.gif' 
                            ? (
                                <div className="gif-item" key={index}>
                                    <img src={item.gifLink}/>
                                    <p className="wallet-address-text">posted by {item.userAddress.toString()}</p>
                                </div>
                            ) 
                            : (<></>)
                        ))}
                    </div>
                </div>
            )
        }
    };


    // on load
    useEffect(() => {
        const onLoad = async () => {
            await checkIfWalletIsConnected();
        };
        window.addEventListener('load', onLoad);
        return () => window.removeEventListener('load', onLoad);
    }, []);

    // on wallet change
    useEffect(() => {
        if (walletAddress) {
            console.log('Fetching GIF list...');
            getGifList();
        }
    }, [walletAddress]);

    return (
        <div className="App">
            <div className={walletAddress ? 'authed-container' : 'container'}>
                <div className="header-container">
                    <p className="header">🖼 Solana GIF stash</p>
                    <p className="sub-text"> Post your fav GIFs on Solana ✨ (devnet)</p>
                    <div className="footer-container">
                        <h2 className="footer-text"> feel free to hmu (EN/JP)</h2>
                        <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
                        <a
                            className="footer-text"
                            href={TWITTER_LINK}
                            target="_blank"
                            rel="noreferrer"
                        >{`@${TWITTER_HANDLE}`}</a>
                        <img alt="twitter account" className="qr-image" src={cohurinQR}/>
                    </div>
                </div>
                <div className="container">
                    {!walletAddress && renderNotConnectedContainer()}
                    {walletAddress && renderConnectedContainer()}
                </div>
                <div className="footer-container"> 
                    <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
                    <a
                        className="footer-text"
                        href={TWITTER_LINK}
                        target="_blank"
                        rel="noreferrer"
                    >{`@${TWITTER_HANDLE}`}</a>
                </div>
            </div>
        </div>
    );
};

export default App;
