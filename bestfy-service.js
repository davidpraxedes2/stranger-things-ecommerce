const https = require('https');

class BestfyService {
    constructor(secretKey, publicKey) {
        this.secretKey = secretKey;
        this.publicKey = publicKey;
        this.apiUrl = 'api.bestfybr.com.br';
        this.apiVersion = '/v1';
    }

    async createTransaction(transactionData) {
        const authString = Buffer.from(`${this.secretKey}:x`).toString('base64');

        const requestBody = JSON.stringify(transactionData);

        const options = {
            hostname: this.apiUrl,
            port: 443,
            path: `${this.apiVersion}/transactions`,
            method: 'POST',
            headers: {
                'authorization': `Basic ${authString}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestBody)
            }
        };

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);

                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(response);
                        } else {
                            reject({
                                statusCode: res.statusCode,
                                error: response
                            });
                        }
                    } catch (error) {
                        reject({
                            statusCode: res.statusCode,
                            error: 'Failed to parse response',
                            rawData: data
                        });
                    }
                });
            });

            req.on('error', (error) => {
                reject({
                    error: 'Network error',
                    message: error.message
                });
            });

            req.write(requestBody);
            req.end();
        });
    }

    async createPixTransaction(orderData) {
        const { amount, customer, items, orderId } = orderData;

        const transactionData = {
            amount: Math.round(amount * 100),
            paymentMethod: 'pix',
            customer: {
                name: customer.name,
                email: customer.email,
                phone: (customer.phone || '').replace(/[^\d+]/g, ''),
                document: {
                    type: 'cpf',
                    number: (customer.cpf || '').replace(/[^\d]/g, '')
                },
                address: customer.address ? {
                    street: customer.address.street || '',
                    streetNumber: customer.address.number || customer.address.streetNumber || '',
                    complement: customer.address.complement || '',
                    neighborhood: customer.address.neighborhood || customer.address.district || '',
                    city: customer.address.city || '',
                    state: customer.address.state || '',
                    zipCode: customer.address.zipCode || '',
                    country: 'BR'
                } : undefined
            },
            items: items.map((item, index) => ({
                externalRef: `item_${orderId}_${index}`,
                title: item.name || item.title,
                unitPrice: Math.round(item.price * 100),
                quantity: item.quantity,
                tangible: true
            })),
            externalRef: `order_${orderId}`,
            metadata: {
                orderId: orderId.toString()
            }
        };

        if (orderData.shipping) {
            transactionData.shipping = {
                name: customer.name,
                fee: Math.round(orderData.shipping.fee * 100),
                address: {
                    street: customer.address.street || '',
                    streetNumber: customer.address.number || customer.address.streetNumber || '',
                    complement: customer.address.complement || '',
                    neighborhood: customer.address.neighborhood || customer.address.district || '',
                    city: customer.address.city || '',
                    state: customer.address.state || '',
                    zipCode: customer.address.zipCode || '',
                    country: 'BR'
                }
            };
        }

        return this.createTransaction(transactionData);
    }

    async createCreditCardTransaction(orderData) {
        const { amount, customer, items, card, installments, orderId } = orderData;

        const transactionData = {
            amount: Math.round(amount * 100),
            paymentMethod: 'credit_card',
            card: {
                number: card.number.replace(/\s/g, ''),
                cvv: card.cvv,
                expirationMonth: parseInt((card.expirationDate || card.expiry).split('/')[0]),
                expirationYear: parseInt('20' + (card.expirationDate || card.expiry).split('/')[1]),
                holderName: (card.holderName || card.holder).toUpperCase()
            },
            installments: installments || 1,
            customer: {
                name: customer.name,
                email: customer.email,
                phone: (customer.phone || '').replace(/[^\d+]/g, ''),
                document: {
                    type: 'cpf',
                    number: (customer.cpf || '').replace(/[^\d]/g, '')
                },
                address: customer.address ? {
                    street: customer.address.street || '',
                    streetNumber: customer.address.number || customer.address.streetNumber || '',
                    complement: customer.address.complement || '',
                    neighborhood: customer.address.neighborhood || customer.address.district || '',
                    city: customer.address.city || '',
                    state: customer.address.state || '',
                    zipCode: customer.address.zipCode || '',
                    country: 'BR'
                } : undefined
            },
            items: items.map((item, index) => ({
                externalRef: `item_${orderId}_${index}`,
                title: item.name || item.title,
                unitPrice: item.unitPrice !== undefined ? item.unitPrice : Math.round(item.price * 100),
                quantity: item.quantity,
                tangible: true
            })),
            externalRef: `order_${orderId}`,
            metadata: {
                orderId: orderId.toString()
            }
        };

        if (orderData.shipping) {
            transactionData.shipping = {
                name: customer.name,
                fee: Math.round(orderData.shipping.fee * 100),
                address: {
                    street: customer.address.street || '',
                    streetNumber: customer.address.number || customer.address.streetNumber || '',
                    complement: customer.address.complement || '',
                    neighborhood: customer.address.neighborhood || customer.address.district || '',
                    city: customer.address.city || '',
                    state: customer.address.state || '',
                    zipCode: customer.address.zipCode || '',
                    country: 'BR'
                }
            };
        }

        return this.createTransaction(transactionData);
    }

    async getTransaction(transactionId) {
        const authString = Buffer.from(`${this.secretKey}:x`).toString('base64');

        const options = {
            hostname: this.apiUrl,
            port: 443,
            path: `${this.apiVersion}/transactions/${transactionId}`,
            method: 'GET',
            headers: {
                'authorization': `Basic ${authString}`,
                'Content-Type': 'application/json'
            }
        };

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);

                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(response);
                        } else {
                            reject({
                                statusCode: res.statusCode,
                                error: response
                            });
                        }
                    } catch (error) {
                        reject({
                            statusCode: res.statusCode,
                            error: 'Failed to parse response',
                            rawData: data
                        });
                    }
                });
            });

            req.on('error', (error) => {
                reject({
                    error: 'Network error',
                    message: error.message
                });
            });

            req.end();
        });
    }

    async refundTransaction(transactionId, amount) {
        const authString = Buffer.from(`${this.secretKey}:x`).toString('base64');

        const requestBody = amount ? JSON.stringify({ amount: Math.round(amount * 100) }) : '';

        const options = {
            hostname: this.apiUrl,
            port: 443,
            path: `${this.apiVersion}/transactions/${transactionId}/refund`,
            method: 'POST',
            headers: {
                'authorization': `Basic ${authString}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestBody)
            }
        };

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);

                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(response);
                        } else {
                            reject({
                                statusCode: res.statusCode,
                                error: response
                            });
                        }
                    } catch (error) {
                        reject({
                            statusCode: res.statusCode,
                            error: 'Failed to parse response',
                            rawData: data
                        });
                    }
                });
            });

            req.on('error', (error) => {
                reject({
                    error: 'Network error',
                    message: error.message
                });
            });

            if (requestBody) {
                req.write(requestBody);
            }
            req.end();
        });
    }
}

module.exports = BestfyService;
