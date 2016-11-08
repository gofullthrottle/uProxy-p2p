
import * as net from '../../lib/net/net.types';

import { VpnDevice } from '../model/vpn_device';
import { CloudSocksProxy, CloudSocksProxyRepository } from './cloud_socks_proxy_server';
import { GetGlobalTun2SocksVpnDevice } from './tun2socks_vpn_device';

class EventLog {
  constructor(private root: Element) {}

  public append(text: string) {
    let wrapped = this.root.ownerDocument.createElement('div');
    wrapped.innerText = text;
    this.root.appendChild(wrapped);
  }
}

export class AppComponent {
  private selectedServerPromise: Promise<CloudSocksProxy> = null;
  private proxyEndpoint: net.Endpoint = null;

  private log: EventLog;

  private addWidget: HTMLDivElement;
  private addTokenText: HTMLTextAreaElement;
  private addButton: HTMLButtonElement;
  private startButton: HTMLButtonElement;
  private stopButton: HTMLButtonElement;
  private startVpnButton: HTMLButtonElement;
  private stopVpnButton: HTMLButtonElement;

  // Parameters:
  // - root: Where to attach the AppComponent to
  // - servers: the repository of socks proxy servers.
  // - vpnDevicePromise: the device to setup the VPN service.
  constructor(private root: Element,
              private servers: CloudSocksProxyRepository,
              private vpnDevicePromise: Promise<VpnDevice>) {
    // TODO: Can use root.querySelector() instead to not depend on document.
    this.log = new EventLog(root.querySelector('#event-log'));
    this.addWidget = root.querySelector('#setup-widget') as HTMLDivElement;
    this.addTokenText = root.querySelector('#token-text') as HTMLTextAreaElement;

    this.addButton = root.querySelector('#set-proxy-button') as HTMLButtonElement;
    this.addButton.onclick = (ev) => {
      console.debug('Pressed Add Button');
      this.pressAddServer();
    };

    this.startButton = root.querySelector('#start-proxy-button') as HTMLButtonElement;
    this.startButton.onclick = (ev) => {
      console.debug('Pressed Start Button');
      this.pressStart();
    };

    this.stopButton = root.querySelector('#stop-proxy-button') as HTMLButtonElement;
    this.stopButton.onclick = (ev) => {
      console.debug('Pressed Stop Button');
      this.pressStop();
    };

    this.startVpnButton = root.querySelector('#start-vpn-button') as HTMLButtonElement;
    this.stopVpnButton = root.querySelector('#stop-vpn-button') as HTMLButtonElement;

    this.vpnDevicePromise.catch((error) => { this.log.append(error); });
    this.startVpnButton.onclick = (ev) => {
      console.debug('Pressed VPN Start Button');
      this.vpnDevicePromise.then((vpnDevice) => {
        return vpnDevice.start(this.proxyEndpoint.port, ((msg) => {
          this.log.append(`Vpn disconnected: ${msg}`);
        }));
      }).then((msg) => {
        this.log.append(`VPN started: ${msg}`);
      }).catch(console.error);
    };
    this.stopVpnButton.onclick = (ev) => {
      console.debug('Pressed VPN Stop Button');
      this.vpnDevicePromise.then((vpnDevice) => {
        return vpnDevice.stop();
      }).then((msg) => {
        this.log.append(`VPN stopped: ${msg}`);
      }).catch(console.error);
    };
  }

  public enterAccessCode(code: string) {
    this.log.append('Entered access code');
    this.addTokenText.value = code;
  }

  public pressAddServer() {
    this.selectedServerPromise = this.servers.addProxy(this.addTokenText.value);
    this.selectedServerPromise.then((server) => {
      this.startButton.disabled = false;
      this.log.append(`Added server at ${server.getRemoteIpAddress()}`)
    }).catch((error) => {
      console.error(error);
      this.log.append(error);
    });
  }

  public pressStart() {
    if (!this.selectedServerPromise) {
      throw new Error('No proxy set');
    }
    this.selectedServerPromise.then((server) => {
      this.startButton.disabled = true;
      return server.start();
    }).then((endpoint) => {
      this.proxyEndpoint = endpoint;
      console.log('Endpoint: ', endpoint);
      this.log.append(`Proxy running on port ${endpoint.port}`);
      this.stopButton.disabled = false;
    }).catch((error) => {
      console.error(error);
      this.log.append(error);GetGlobalTun2SocksVpnDevice()
      this.startButton.disabled = false;
    });
  }

  public pressStop() {
    if (!this.selectedServerPromise) {
      throw new Error('No proxy set');
    }
    this.selectedServerPromise.then((server) => {
      this.log.append('Proxy stopped');
      return server.stop();
    }).then(() => {
      this.startButton.disabled = false;
      this.stopButton.disabled = true;
    }).catch(console.error);
  }
}
