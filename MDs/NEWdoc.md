# this is the content of aditya@instance-20260418-102914:/opt/swarajdesk/envs$ nano user-be.env   
user-be.env
NODE_ENV=production
PORT=3000
WS_PORT=3001
frontend=https://gsc-user-fe.abhasbehera.in
frontend_alt=https://gsc-user-fe.abhasbehera.in
backend=https://gsc-user-be.abhasbehera.in
worker=https://gsc-ws-user-be.abhasbehera.in
frontend_admin=https://gsc-admin-fe.abhasbehera.in
backend_admin=https://gsc-admin-be.abhasbehera.in
agents=https://gsc-agents-be.abhasbehera.in
blockchainURL=https://gsc-blockchain-be.abhasbehera.in
PRISMA_CLIENT_ENGINE_TYPE=binary
DATABASE_URL=postgresql://myuser:mypassword@db.abhasbehera.in:5432/mydb
JWT_SECRET=Big2026
REDIS_URL=redis://default:strongpassword@redis:6379
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=strongpassword
AWS_REGION=ap-south-2
S3_AWS_ACCESS_KEY_ID=AKIAZ53VJYCLAN563LY2
S3_AWS_SECRET_ACCESS_KEY=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
AWS_BUCKET=sih-swaraj
SECRETS_AWS_ACCESS_KEY_ID=AKIAZ53VJYCLAGVGCIWC
SECRETS_AWS_SECRET_ACCESS_KEY=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
SECRET_NAME_AWS_USER_BE=sih-swaraj-user-be-prod
pinAPIBase=https://api.postalpincode.in/pincode
RECAPTCHA_SECRET_KEY=6Lcje6MsAAAAAHShcyOEU-wlncIdg3n0ZjWj70fI
SKIP_CAPTCHA=true
ALLOWED_ORIGINS=https://gsc-admin-fe.abhasbehera.in,https://gsc-user-fe.abhasbehera.in,https://gsc-user-be.abhasbehera.in,https://gsc-ws-user-be.abhasbehera.in,https://gsc-admin-be.abhasbehera.in,https://gsc-comp-queue.abhasbehera.in>


# content of aditya@instance-20260418-102914:~$ docker exec -it d6ab1cf32c14 sh -> /app # nano index.ts
mport express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import { PrismaClient } from './prisma/generated/client/client';

//routes
import { helthPoint } from "./routes/helth";
import { addUserRouter } from "./routes/adduser";
import { loginUserRouter } from "./routes/loginUser";
import { logoutUserRouter } from "./routes/logoutUser";
import { createComplaintRouter } from "./routes/createComplaint";
import { getComplaintRouter } from "./routes/getComplaint";
import { districtsRouter } from "./routes/districts";
import { categoriesRouter } from "./routes/categories";
import { createAuthMiddleware } from "./middleware/authRoute";
import { chatRouter } from "./routes/chat";
import { createBadgeRouter } from "./routes/badges";
import { createUserProfileRouter } from "./routes/userProfile";
import { createUserStatsRouter } from "./routes/userStats";
import { createAnnouncementsRouter } from "./routes/announcements";
import { createUpdateProfileRouter } from "./routes/updateProfile";
import { createSurveysRouter, createProtectedSurveysRouter } from "./routes/surveys";

dotenv.config();

export class Server {
  private app: Express;
  private db: PrismaClient;
  private readonly frontEndUser?: string;
  private readonly frontEndUserAlt?: string;
  private readonly backEndUser?: string;
  private readonly worker?: string;
  private readonly frontEndAdmin?: string;
  private readonly backEndAdmin?: string;

  constructor(db: PrismaClient) {
    this.app = express();
    this.db = db;

    this.frontEndUser = process.env.frontend;
    this.frontEndUserAlt = process.env.frontend_alt;
    this.backEndUser = process.env.backend;
    this.worker = process.env.worker;
    this.frontEndAdmin = process.env.frontend_admin;
    this.backEndAdmin = process.env.backend_admin;

    this.initializeMiddlewares();
    this.initializeRoutes();
  }

  private initializeMiddlewares(): void {
    // Parse allowed origins from environment variable
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : true;

    // CORS must come BEFORE other middleware
    const corsOptions = {
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      optionsSuccessStatus: 200,
    };
    this.app.use(cors(corsOptions));
    this.app.options('/{*path}', cors(corsOptions));

    this.app.use(express.json());
    this.app.use(helmet());
    this.app.use(compression());
  }

  private initializeRoutes(): void {....................

# again redis error
aditya@instance-20260418-102914:~$ docker service logs swarajdesk_user-be -f --tail 10
swarajdesk_user-be.1.z9acke6ikvbe@instance-20260418-102914    | Complaint queue service initialized
swarajdesk_user-be.1.z9acke6ikvbe@instance-20260418-102914    | Server is running on port 3000
swarajdesk_user-be.1.z9acke6ikvbe@instance-20260418-102914    | Environment: production
swarajdesk_user-be.1.z9acke6ikvbe@instance-20260418-102914    | ✅ Redis Like Counter Service connected
swarajdesk_user-be.1.z9acke6ikvbe@instance-20260418-102914    | ✅ Like sync worker started
swarajdesk_user-be.1.z9acke6ikvbe@instance-20260418-102914    | 🚀 WebSocket server running on ws://localhost:3001/ws
swarajdesk_user-be.1.z9acke6ikvbe@instance-20260418-102914    | WebSocket server is running on port 3001
swarajdesk_user-be.1.z9acke6ikvbe@instance-20260418-102914    | Received SIGTERM. Shutting down gracefully...
swarajdesk_user-be.1.z9acke6ikvbe@instance-20260418-102914    | 🛑 Like sync worker stopped
swarajdesk_user-be.1.z9acke6ikvbe@instance-20260418-102914    | 🛑 WebSocket server stopped
swarajdesk_user-be.1.ea6caunwspol@instance-20260418-102914    | 225 |             onTimeout = () => socket.destroy(new errors_1.ConnectionTimeoutError());
swarajdesk_user-be.1.lutyqst8ycvo@instance-20260418-102914    | Complaint queue service initialized
swarajdesk_user-be.1.ea6caunwspol@instance-20260418-102914    |                                                    ^
swarajdesk_user-be.1.lutyqst8ycvo@instance-20260418-102914    | Server is running on port 3000
swarajdesk_user-be.1.ea6caunwspol@instance-20260418-102914    | error: Connection timeout
swarajdesk_user-be.1.lutyqst8ycvo@instance-20260418-102914    | Environment: production
swarajdesk_user-be.1.ea6caunwspol@instance-20260418-102914    |       at onTimeout (/app/node_modules/@redis/client/dist/lib/client/socket.js:225:46)
swarajdesk_user-be.1.lutyqst8ycvo@instance-20260418-102914    | ✅ Redis Like Counter Service connected
swarajdesk_user-be.1.lutyqst8ycvo@instance-20260418-102914    | ✅ Like sync worker started
swarajdesk_user-be.1.lutyqst8ycvo@instance-20260418-102914    | 🚀 WebSocket server running on ws://localhost:3001/ws
swarajdesk_user-be.1.lutyqst8ycvo@instance-20260418-102914    | WebSocket server is running on port 3001
swarajdesk_user-be.1.lutyqst8ycvo@instance-20260418-102914    | Received SIGTERM. Shutting down gracefully...
swarajdesk_user-be.1.lutyqst8ycvo@instance-20260418-102914    | 🛑 Like sync worker stopped
swarajdesk_user-be.1.hykluyrhjnct@instance-20260418-102914    | 222 |         const socket = this.#socketFactory.create();
swarajdesk_user-be.1.hykluyrhjnct@instance-20260418-102914    | 223 |         let onTimeout;
swarajdesk_user-be.1.hykluyrhjnct@instance-20260418-102914    | 224 |         if (this.#connectTimeout !== undefined) {
swarajdesk_user-be.1.lutyqst8ycvo@instance-20260418-102914    | 🛑 WebSocket server stopped
swarajdesk_user-be.1.hykluyrhjnct@instance-20260418-102914    | 225 |             onTimeout = () => socket.destroy(new errors_1.ConnectionTimeoutError());
swarajdesk_user-be.1.hykluyrhjnct@instance-20260418-102914    |                                                    ^
swarajdesk_user-be.1.hykluyrhjnct@instance-20260418-102914    | error: Connection timeout
swarajdesk_user-be.1.hykluyrhjnct@instance-20260418-102914    |       at onTimeout (/app/node_modules/@redis/client/dist/lib/client/socket.js:225:46)
swarajdesk_user-be.1.hykluyrhjnct@instance-20260418-102914    |       at emit (node:events:92:22)
swarajdesk_user-be.1.hykluyrhjnct@instance-20260418-102914    |       at node:net:458:12
swarajdesk_user-be.1.hykluyrhjnct@instance-20260418-102914    |
swarajdesk_user-be.1.w5tswn9oa3yb@instance-20260418-102914    |     code: "ENOTFOUND"
swarajdesk_user-be.1.w5tswn9oa3yb@instance-20260418-102914    |
swarajdesk_user-be.1.w5tswn9oa3yb@instance-20260418-102914    |
swarajdesk_user-be.1.w5tswn9oa3yb@instance-20260418-102914    | Redis Complaint Cache Client Error DNSException: getaddrinfo ENOTFOUND
swarajdesk_user-be.1.w5tswn9oa3yb@instance-20260418-102914    |  syscall: "getaddrinfo",
swarajdesk_user-be.1.w5tswn9oa3yb@instance-20260418-102914    |    errno: 4,
swarajdesk_user-be.1.w5tswn9oa3yb@instance-20260418-102914    |     code: "ENOTFOUND"
swarajdesk_user-be.1.w5tswn9oa3yb@instance-20260418-102914    |
swarajdesk_user-be.1.w5tswn9oa3yb@instance-20260418-102914    |
swarajdesk_user-be.1.w5tswn9oa3yb@instance-20260418-102914    | Received SIGTERM. Shutting down gracefully...
swarajdesk_user-be.1.ea6caunwspol@instance-20260418-102914    |       at emit (node:events:92:22)
swarajdesk_user-be.1.ea6caunwspol@instance-20260418-102914    |       at node:net:458:12
swarajdesk_user-be.1.ea6caunwspol@instance-20260418-102914    |
swarajdesk_user-be.1.ea6caunwspol@instance-20260418-102914    | Received SIGTERM. Shutting down gracefully...
swarajdesk_user-be.1.ea6caunwspol@instance-20260418-102914    | 🛑 Like sync worker stopped
swarajdesk_user-be.1.ea6caunwspol@instance-20260418-102914    | 🛑 WebSocket server stopped
^Caditya@instance-20260418-102914:~$ docker service logs swarajdesk_user-be -f --tail 20

aditya@instance-20260418-102914:~$ docker service logs swarajdesk_admin-be -f --tail 10
swarajdesk_admin-be.1.rxvg1umq1lek@instance-20260418-102914    | [Redis] Connecting to redis://<redacted>@redis:6379
swarajdesk_admin-be.1.rxvg1umq1lek@instance-20260418-102914    | Redis client connected
swarajdesk_admin-be.1.rxvg1umq1lek@instance-20260418-102914    | Redis client ready
swarajdesk_admin-be.1.rxvg1umq1lek@instance-20260418-102914    | [AutoAssign] Polling started (15s interval)
swarajdesk_admin-be.1.rxvg1umq1lek@instance-20260418-102914    | [SLA-Cron] Starting — will tick every 15 minutes
swarajdesk_admin-be.1.rxvg1umq1lek@instance-20260418-102914    | Server is running on port 3002
swarajdesk_admin-be.1.rxvg1umq1lek@instance-20260418-102914    | Environment: production
swarajdesk_admin-be.1.rxvg1umq1lek@instance-20260418-102914    | Processed Complaint Queue Redis client connected successfully
swarajdesk_admin-be.1.rxvg1umq1lek@instance-20260418-102914    | Blockchain Queue Redis client connected successfully
swarajdesk_admin-be.1.rxvg1umq1lek@instance-20260418-102914    | Received SIGTERM. Shutting down gracefully...
swarajdesk_admin-be.1.wl64wv10onpe@instance-20260418-102914    | 225 |             onTimeout = () => socket.destroy(new errors_1.ConnectionTimeoutError());
swarajdesk_admin-be.1.jx327tqll5ag@instance-20260418-102914    | [Redis] Connecting to redis://<redacted>@redis:6379
swarajdesk_admin-be.1.wl64wv10onpe@instance-20260418-102914    |                                                    ^
swarajdesk_admin-be.1.jx327tqll5ag@instance-20260418-102914    | Redis client connected
swarajdesk_admin-be.1.jx327tqll5ag@instance-20260418-102914    | Redis client ready
swarajdesk_admin-be.1.wl64wv10onpe@instance-20260418-102914    | error: Connection timeout
swarajdesk_admin-be.1.wl64wv10onpe@instance-20260418-102914    |       at onTimeout (/app/node_modules/@redis/client/dist/lib/client/socket.js:225:46)
swarajdesk_admin-be.1.jx327tqll5ag@instance-20260418-102914    | [AutoAssign] Polling started (15s interval)
swarajdesk_admin-be.1.wl64wv10onpe@instance-20260418-102914    |       at emit (node:events:92:22)
swarajdesk_admin-be.1.jx327tqll5ag@instance-20260418-102914    | [SLA-Cron] Starting — will tick every 15 minutes
swarajdesk_admin-be.1.wl64wv10onpe@instance-20260418-102914    |       at node:net:458:12
swarajdesk_admin-be.1.jx327tqll5ag@instance-20260418-102914    | Server is running on port 3002
swarajdesk_admin-be.1.jx327tqll5ag@instance-20260418-102914    | Environment: production
swarajdesk_admin-be.1.jx327tqll5ag@instance-20260418-102914    | Processed Complaint Queue Redis client connected successfully
swarajdesk_admin-be.1.jx327tqll5ag@instance-20260418-102914    | Blockchain Queue Redis client connected successfully
swarajdesk_admin-be.1.jx327tqll5ag@instance-20260418-102914    | Received SIGTERM. Shutting down gracefully...
swarajdesk_admin-be.1.jaety37x183x@instance-20260418-102914    | [Redis] Connecting to redis://<redacted>@redis:6379
swarajdesk_admin-be.1.jaety37x183x@instance-20260418-102914    | Redis client connected
swarajdesk_admin-be.1.jaety37x183x@instance-20260418-102914    | Redis client ready
swarajdesk_admin-be.1.jaety37x183x@instance-20260418-102914    | [AutoAssign] Polling started (15s interval)
swarajdesk_admin-be.1.jaety37x183x@instance-20260418-102914    | [SLA-Cron] Starting — will tick every 15 minutes
swarajdesk_admin-be.1.jaety37x183x@instance-20260418-102914    | Server is running on port 3002
swarajdesk_admin-be.1.jaety37x183x@instance-20260418-102914    | Environment: production
swarajdesk_admin-be.1.jaety37x183x@instance-20260418-102914    | Processed Complaint Queue Redis client connected successfully
swarajdesk_admin-be.1.jaety37x183x@instance-20260418-102914    | Blockchain Queue Redis client connected successfully
swarajdesk_admin-be.1.jaety37x183x@instance-20260418-102914    | Received SIGTERM. Shutting down gracefully...
swarajdesk_admin-be.1.xb48cehbal77@instance-20260418-102914    | 222 |         const socket = this.#socketFactory.create();
swarajdesk_admin-be.1.xb48cehbal77@instance-20260418-102914    | 223 |         let onTimeout;
swarajdesk_admin-be.1.xb48cehbal77@instance-20260418-102914    | 224 |         if (this.#connectTimeout !== undefined) {
swarajdesk_admin-be.1.xb48cehbal77@instance-20260418-102914    | 225 |             onTimeout = () => socket.destroy(new errors_1.ConnectionTimeoutError());
swarajdesk_admin-be.1.xb48cehbal77@instance-20260418-102914    |                                                    ^
swarajdesk_admin-be.1.xb48cehbal77@instance-20260418-102914    | error: Connection timeout
swarajdesk_admin-be.1.xb48cehbal77@instance-20260418-102914    |       at onTimeout (/app/node_modules/@redis/client/dist/lib/client/socket.js:225:46)
swarajdesk_admin-be.1.xb48cehbal77@instance-20260418-102914    |       at emit (node:events:92:22)
swarajdesk_admin-be.1.xb48cehbal77@instance-20260418-102914    |       at node:net:458:12
swarajdesk_admin-be.1.xb48cehbal77@instance-20260418-102914    |
swarajdesk_admin-be.1.wl64wv10onpe@instance-20260418-102914    |
swarajdesk_admin-be.1.wl64wv10onpe@instance-20260418-102914    | Redis client connected
swarajdesk_admin-be.1.wl64wv10onpe@instance-20260418-102914    | Redis client ready
swarajdesk_admin-be.1.wl64wv10onpe@instance-20260418-102914    | Received SIGTERM. Shutting down gracefully...

aditya@instance-20260418-102914:~$ ^C
aditya@instance-20260418-102914:~$ docker service logs swarajdesk_agents -f --tail 10
swarajdesk_agents.1.e7oat44ug2ox@instance-20260418-102914    |  syscall: "connect",
swarajdesk_agents.1.e7oat44ug2ox@instance-20260418-102914    |     port: 6379,
swarajdesk_agents.1.e7oat44ug2ox@instance-20260418-102914    |  address: "10.0.1.23",
swarajdesk_agents.1.e7oat44ug2ox@instance-20260418-102914    |     code: "ECONNREFUSED"
swarajdesk_agents.1.e7oat44ug2ox@instance-20260418-102914    |
swarajdesk_agents.1.e7oat44ug2ox@instance-20260418-102914    |       at afterConnect (node:net:1155:39)
swarajdesk_agents.1.e7oat44ug2ox@instance-20260418-102914    |       at connectError (node:net:352:48)
swarajdesk_agents.1.e7oat44ug2ox@instance-20260418-102914    |
swarajdesk_agents.1.e7oat44ug2ox@instance-20260418-102914    | [SessionMemory] Redis reconnect limit reached, falling back to in-memory
swarajdesk_agents.1.e7oat44ug2ox@instance-20260418-102914    | [SessionMemory] Redis error: connect ECONNREFUSED 10.0.1.23:6379
swarajdesk_agents.1.qzjcjwck06x2@instance-20260418-102914    | Agents Service running on port 3040
swarajdesk_agents.1.rv6umlvi8wt8@instance-20260418-102914    | Agents Service running on port 3040
swarajdesk_agents.1.6w2z8n7ohf99@instance-20260418-102914    |    errno: -111,
swarajdesk_agents.1.6w2z8n7ohf99@instance-20260418-102914    |  syscall: "connect",
swarajdesk_agents.1.6w2z8n7ohf99@instance-20260418-102914    |     port: 6379,
swarajdesk_agents.1.6w2z8n7ohf99@instance-20260418-102914    |  address: "10.0.1.23",
swarajdesk_agents.1.6w2z8n7ohf99@instance-20260418-102914    |     code: "ECONNREFUSED"
swarajdesk_agents.1.6w2z8n7ohf99@instance-20260418-102914    |
swarajdesk_agents.1.6w2z8n7ohf99@instance-20260418-102914    |       at afterConnect (node:net:1155:39)
swarajdesk_agents.1.6w2z8n7ohf99@instance-20260418-102914    |       at connectError (node:net:352:48)
swarajdesk_agents.1.6w2z8n7ohf99@instance-20260418-102914    |
swarajdesk_agents.1.6w2z8n7ohf99@instance-20260418-102914    | [SessionMemory] Redis error: connect ECONNREFUSED 10.0.1.23:6379
swarajdesk_agents.1.qr7d5d6d0k0r@instance-20260418-102914    | Agents Service running on port 3040


aditya@instance-20260418-102914:~$ docker service ls
ID             NAME                       MODE         REPLICAS   IMAGE                                          PORTS
0ak70vz1kler   monitoring_cadvisor        global       1/1        gcr.io/cadvisor/cadvisor:latest
yzm570tqu573   monitoring_grafana         replicated   1/1        grafana/grafana:latest
pc5qprrc443x   monitoring_loki            replicated   1/1        grafana/loki:latest
xh9oed85b7ym   monitoring_node-exporter   global       1/1        prom/node-exporter:latest
xsbhm7fdvf07   monitoring_prometheus      replicated   1/1        prom/prometheus:latest
isl7skjpbclz   monitoring_promtail        global       1/1        grafana/promtail:latest
2sbnilmc8u9d   monitoring_uptime-kuma     replicated   1/1        louislam/uptime-kuma:latest
pp7jhr9god8z   swarajdesk_admin-be        replicated   1/1        ogadityahota/sih-swarajdesk-admin-be:latest
ydywa9o3jhsl   swarajdesk_agents          replicated   1/1        ogadityahota/swarajdesk-agents:latest
xhf0xvjfjc5b   swarajdesk_blockchain-be   replicated   1/1        ogadityahota/swarajdesk-blockchain-be:latest
m0n7w2s7iqxx   swarajdesk_compqueue       replicated   1/1        ogadityahota/swarajdesk-comp-queue:latest
s6tutxixsfh9   swarajdesk_redis           replicated   1/1        redis:7-alpine
14h0wvezjr91   swarajdesk_user-be         replicated   1/1        ogadityahota/swarajdesk-user-be:latest
upu6otgqdray   traefik_traefik            replicated   1/1        traefik:v3.6
aditya@instance-20260418-102914:~$

# cors on https://gsc-user-fe.abhasbehera.in/loginUser but gsc user be is alreay added as cors 
loginUser:1 Access to fetch at 'https://gsc-user-be.abhasbehera.in/api/users/login' from origin 'https://gsc-user-fe.abhasbehera.in' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.

# conserned folders 
packages/user-be 
packages/deployment

# issues
1. cors issue even after correct cors policy are added 
2. again is failling again even after local (vm) deployment of it ... this error happning when using ❯ ansible-playbook -i inventory.ini provision-vm.yaml or ansible-playbook -i inventory.ini deploy.yaml or  ansible-playbook -i inventory.ini redeploy-envs.yaml -e "image_tag=latest"