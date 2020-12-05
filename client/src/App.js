import React, {Component} from 'react';
import {w3cwebsocket as W3CWebSocket} from "websocket";
import Identicon from 'react-identicons';
import {
    Navbar,
    NavbarBrand,
    UncontrolledTooltip
} from 'reactstrap';
import 'medium-editor/dist/css/medium-editor.css';
import 'medium-editor/dist/css/themes/default.css';
import './App.css';
import Config from './config';


const client = new W3CWebSocket(Config.SERVER_URL);
const expression = new RegExp("^[a-zA-Z][a-zA-Z0-9]*");

const typesDef = {
    CREATE_CONVERSATION_EVENT: "createConversationEvent",
    JOIN_CONVERSATION_EVENT: "joinConversationEvent",
    BAN_DECK_EVENT: "banDeckEvent",
    CHOICE_DECK_EVENT: "choiceDeckEvent",
    USER_DISCONNECTED_EVENT: "userDisconnectedEvent",
    UPDATE_LOG_EVENT: "logUpdateEvent",
    ERROR_EVENT: "errorEvent",
};


class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            currentUsers: [],
            log: [],
            userId: '',
            username: '',
            conversationId: '',
            bannedDeck: '',
            chosenDeck: '',
            error: '',
            banSubmitted: false,
            choiceSubmitted: false,
            isUsernameValid: true
        };
    }

    handleUsernameChange = (e) => {
        this.setState({
            username: e.target.value
        });
        this.state.isUsernameValid = expression.test(e.target.value);
    };

    back = () => {
        this.setState({
            currentUsers: [],
            log: [],
            conversationId: '',
            bannedDeck: '',
            error: '',
            banSubmitted: false,
            choiceSubmitted: false,
        });
    };

    submitBan = () => {
        const userId = this.state.userId;
        const conversationId = this.state.conversationId;
        const bannedDeck = this.bannedDeckInput.value;
        const data = {
            userId,
            conversationId,
            bannedDeck,
        };
        if (bannedDeck.trim()) {
            this.setState({
                ...data
            }, () => {
                client.send(JSON.stringify({
                    ...data,
                    type: typesDef.BAN_DECK_EVENT,
                }));
            });
        }
    };

    submitChoice = () => {
        const userId = this.state.userId;
        const conversationId = this.state.conversationId;
        const chosenDeck = this.chosenDeckInput.value;
        const data = {
            userId,
            conversationId,
            chosenDeck,
        };
        if (chosenDeck.trim()) {
            this.setState({
                ...data
            }, () => {
                client.send(JSON.stringify({
                    ...data,
                    type: typesDef.CHOICE_DECK_EVENT,
                }));
            });
        }
    };


    createConversation = () => {
        const username = this.usernameInput.value;
        if (username.trim()) {
            const data = {
                username,
            };
            this.setState({
                ...data
            }, () => {
                client.send(JSON.stringify({
                    ...data,
                    type: typesDef.CREATE_CONVERSATION_EVENT
                }));
            });
        }
    };

    joinConversation = () => {
        const username = this.usernameInput.value;
        const conversationId = this.conversationIdInput.value;
        if (username.trim()) {
            const data = {
                username,
                conversationId
            };
            this.setState({
                username
            }, () => {
                client.send(JSON.stringify({
                    ...data,
                    type: typesDef.JOIN_CONVERSATION_EVENT
                }));
            });
        }
    };

    componentWillMount() {
        client.onopen = () => {
            console.log('WebSocket Client Connected');
        };

        client.onmessage = (message) => {
            const dataFromServer = JSON.parse(message.data);
            const stateToChange = {};
            switch (dataFromServer.type) {
                case typesDef.CREATE_CONVERSATION_EVENT:
                    stateToChange.currentUsers = dataFromServer.data.conversation.users;
                    stateToChange.conversationId = dataFromServer.data.conversation.conversationId;
                    stateToChange.userId = dataFromServer.data.userId;
                    stateToChange.error = '';
                    break;

                case typesDef.JOIN_CONVERSATION_EVENT:
                    stateToChange.currentUsers = dataFromServer.data.conversation.users;
                    stateToChange.conversationId = dataFromServer.data.conversation.conversationId;
                    stateToChange.userId = dataFromServer.data.userId;
                    stateToChange.error = '';

                    break;

                case typesDef.BAN_DECK_EVENT:
                    stateToChange.banSubmitted = true;
                    stateToChange.bannedDeck = dataFromServer.data.bannedDeck;
                    stateToChange.error = '';

                    break;

                case typesDef.CHOICE_DECK_EVENT:
                    stateToChange.choiceSubmitted = true;
                    stateToChange.chosenDeck = dataFromServer.data.chosenDeck;
                    stateToChange.error = '';

                    break;

                case typesDef.UPDATE_LOG_EVENT:
                    stateToChange.currentUsers = dataFromServer.data.users;
                    stateToChange.log = dataFromServer.data.log;
                    stateToChange.error = '';

                    break;

                case typesDef.ERROR_EVENT:
                    stateToChange.error = dataFromServer.data.message;
                    break;

                default:
                    break;
            }
            this.setState({
                ...stateToChange
            });
        };
    }

    showLoginSection = () => (
        <div className="account">
            <div className="account__wrapper">
                <div className="account__card">
                    <div className="account__profile">
                        <Identicon className="account__avatar" size={64} string="randomness"/>
                        <p className="account__name">Hello, KeyForge Player!</p>
                        <p className="account__sub">This is a tool to simultaneously reveal your bans for triad
                            games</p>
                        <p className="account__sub">Username: </p>
                        <p className="account__sub">(should start from letter and contain only letters and numbers)</p>
                    </div>
                    <input name="username" ref={(input) => {
                        this.usernameInput = input;
                    }}
                       value={this.state.username}
                       onChange={this.handleUsernameChange}
                       className={this.state.isUsernameValid ? "form-control" : "form-control error-input"}
                    />
                    <p className="button__desc">If you want to create new conversation, just press this button:</p>
                    <button type="button" onClick={() => this.createConversation()}
                            disabled={!this.state.username || !this.state.isUsernameValid}
                            className="btn btn-primary account__btn">Create Conversation
                    </button>
                    <p className="button__desc">Or enter conversation ID received from your opponent here:</p>
                    <input name="conversation-id" ref={(input) => {
                        this.conversationIdInput = input;
                    }}
                           disabled={!this.state.username || !this.state.isUsernameValid}
                           className="form-control"/>
                    <button type="button" onClick={() => this.joinConversation()}
                            disabled={!this.state.username || !this.state.isUsernameValid}
                            className="btn btn-primary account__btn">Join Conversation
                    </button>
                    {this.state.error && (
                        <div className="error-msg">
                            <p className="error-text">{this.state.error}</p>
                        </div>)}
                </div>

            </div>
        </div>
    )

    showBanSection = () => (
        <div className="account">
            <div className="account__wrapper">
                <div className="account__card">
                    <div className="account__profile">
                        <div className="currentusers">
                            {this.state.currentUsers.map(user => (
                                <React.Fragment>
                                  <span id={user.username} className="userInfo" key={user.username}>
                                    <Identicon className="account__avatar" style={{backgroundColor: user.randomcolor}}
                                               size={40}
                                               string={user.username}/>
                                  </span>
                                    <UncontrolledTooltip placement="top" target={user.username}>
                                        {user.username}
                                    </UncontrolledTooltip>
                                </React.Fragment>
                            ))}
                        </div>
                        <div>
                            <React.Fragment>
                                <p className="conv__id">Conversation ID: {this.state.conversationId}</p>
                            </React.Fragment>
                        </div>
                    </div>
                    <p className="button__desc">Enter deck name you want to ban:</p>
                    <input name="banned-deck" ref={(input) => {
                        this.bannedDeckInput = input;
                    }}
                           className="form-control"
                           disabled={this.state.banSubmitted}
                    />
                    <button type="button" onClick={() => this.submitBan()}
                            disabled={this.state.banSubmitted}
                            className="btn btn-primary account__btn">Submit your ban
                    </button>
                    {this.state.banSubmitted && (
                        <div className="ok-msg">
                            <p className="ok-text">Your decision accepted</p>
                        </div>)}

                    <p className="button__desc">Enter deck name you want to play:</p>


                    <input name="played-deck" ref={(input) => {
                        this.chosenDeckInput = input;
                    }}
                           className="form-control"
                           disabled={!this.state.banSubmitted || this.state.choiceSubmitted}
                    />
                    <button type="button" onClick={() => this.submitChoice()}
                            disabled={!this.state.banSubmitted || this.state.choiceSubmitted}
                            className="btn btn-primary account__btn">Submit your choice
                    </button>
                    {this.state.choiceSubmitted && (
                        <div className="ok-msg">
                            <p className="ok-text">Your decision accepted</p>
                        </div>)}

                    {this.state.error && (
                        <div className="error-msg">
                            <p className="error-text">{this.state.error}</p>
                        </div>)}

                    <p className="button__desc">Attention! You will not be able to enter same conversation again</p>

                    <button type="button" onClick={() => this.back()}
                            className="btn btn-primary account__btn">BACK
                    </button>

                </div>

                <div className="history-holder">
                    <ul>
                        {this.state.log.map((activity, index) => <li
                            key={`activity-${index}`}>{activity}</li>)}
                    </ul>
                </div>
            </div>
        </div>
    )

    render() {
        const {
            conversationId
        } = this.state;
        return (
            <React.Fragment>
                <Navbar color="light" light>
                    <NavbarBrand href="/">Triad ban tool</NavbarBrand>
                </Navbar>
                <div className="container-fluid">
                    {conversationId ? this.showBanSection() : this.showLoginSection()}
                </div>
            </React.Fragment>
        );
    }
}

export default App;
