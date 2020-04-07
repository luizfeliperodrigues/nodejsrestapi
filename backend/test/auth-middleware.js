const authMiddleware = require('../middleware/is-auth');

const jwt = require('jsonwebtoken');

// Sinon serve para o uso do metodo 'stubs', para substituir metodos externos, de algum packeage
const sinon = require('sinon');

const expect = require('chai').expect;

// Usa-se 'describe' para ajudar na descrição do que está se testando
describe('Auth middleware', function() {
    it('should throw an error if no authorization header is present', function () {
        const req = {
            get: function(headerName) {
                return null;
            }
        };
    
        expect(authMiddleware.bind(this, req, {}, () => {})).to.throw('Not authenticated.');
    });
    
    it('should throw an error if the authorization header is only one string', function() {
        const req = {
            get: function(headerName) {
                return 'xyz';
            }
        };
    
        expect(authMiddleware.bind(this, req, {}, () => {})).to.throw();
    });

    it('should throw an error if the token cannot be verified', function () {
        const req = {
            get: function(headerName) {
                return 'Bearer xyz';
            }
        };
    
        expect(authMiddleware.bind(this, req, {}, () => {})).to.throw();
    });

    it('should yield an userId after decoding the token', function () {
        const req = {
            get: function(headerName) {
                return 'Bearer xyasdfasdfasdafdsafdasdz';
            }
        };
        
        sinon.stub(jwt, 'verify');
        jwt.verify.returns({ userId: 'abc' });

        authMiddleware(req, {}, () => {});
        expect(req).to.have.property('userId');

        jwt.verify.restore();
    });
});

