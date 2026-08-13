# Infrastructure Engineer — Developer Guidelines & Responsibilities

## 1. Role Overview
The Infrastructure Engineer is responsible for the underlying infrastructure design, networking, load balancing, and DNS for the Adaptive Examination & AI Learning Platform. You ensure seamless communication between the Next.js frontend, Express API, and Python FastAPI AI server.

## 2. Core Responsibilities
1. Designing and managing VPC architecture.
2. Configuring Load Balancers for the Express API and AI Gateway.
3. Managing SSL/TLS certificates and HTTPS enforcement.
4. Setting up secure database networking and peering.
5. Allocating and managing networking for AI server GPUs.
6. Managing DNS records and routing.
7. Implementing DDoS protection and WAF rules.
8. Maintaining VPNs or Bastion hosts for secure access.

## 3. Work Boundaries
| Area | Ownership Level |
|---|---|
| VPC Design | OWNS |
| Load Balancing | OWNS |
| DNS and SSL/TLS | OWNS |
| Database Networking | OWNS |
| AI Server GPU Allocation | OWNS |
| Application Code | OUT OF SCOPE |
| Cloud Resource Provisioning | COLLABORATES |

## 4. Phase-by-Phase Goals

### Phase 1 — Foundation
- Design VPC architecture and subnets for 1.1 Monorepo Setup & Infrastructure.
- Configure internal routing for PostgreSQL 16 and Redis 7.
- See docs/phases/phase-01-foundation.md for full details.

### Phase 2 — Academic Structure
- Configure DNS for dev environments to support 2.5 Course-Subject-Syllabus Frontend testing.

### Phase 3 — Question Bank
- Configure internal load balancing and CDN routing for media delivery in 3.2 Question CRUD.

### Phase 4 — Exam Pattern
- No primary deliverables. Support other teams as needed.

### Phase 5 — Exam Generator
- Implement advanced routing or service mesh if needed to handle load spikes during 5.1 Exam Generation Engine processing.

### Phase 6 — Exam System
- Stress test load balancers to ensure they handle simulated peak exam load for 6.2 Exam Attempt Session and 6.4 Exam Completion.

### Phase 7 — Exam Archive
- Configure routing and secure networking for 7.6 Exam File Storage access.

### Phase 8 — Student Analytics
- Configure networking for analytics read replicas to support the 8.1 Mastery Engine.

### Phase 9 — Personalized Practice
- Optimize internal network latency between backend services for 9.2 Personalized Practice Paper Generation.

### Phase 10 — Preview System
- No primary deliverables. Support other teams as needed.

### Phase 11 — AI Question System
- Configure load balancer and networking for the 11.1 AI Gateway Architecture.
- Allocate networking for GPU instances and 11.8 Cloud AI Integration providers.

### Phase 12 — AI Interview
- Implement low-latency WebSocket routing and load balancing for 12.3 Controlled Natural Conversation Engine and audio streaming.

### Phase 13 — Subscriptions
- Configure secure ingress for 13.5 Billing Integration (Pluggable) webhooks.

### Phase 14 — Production Hardening
- Implement 14.7 Abuse Protection (Anti-cheating measures, rate limiting, DDoS protection) at the network edge.
- Support 14.1 Security Hardening with WAF rules, CSP, and HSTS.
- Support 14.4 Monitoring & Alerting for all load balancers and network components.

## 5. Key Guidelines
### 5.1 Technical Standards
- Zero Trust Network Architecture.
- Automated certificate management (e.g., Let's Encrypt / ACM).
### 5.2 Collaboration Model
- Work with Cloud Engineer to provision networking resources.
- Work with Security Engineer on WAF and DDoS rules.
### 5.3 Tools & Processes
- Terraform, Kubernetes Ingress, Nginx/HAProxy.
- Cloudflare or equivalent edge network.

## 6. Do's ✅
1. Do use private subnets for all internal services.
2. Do terminate SSL at the load balancer.
3. Do use automated tools for SSL certificate renewal.
4. Do implement WAF rules to protect against common web exploits.
5. Do use DNS aliases (CNAME/ALIAS) instead of IP addresses.
6. Do configure health checks on all load balancers.
7. Do implement rate limiting at the edge.
8. Do segregate environments (dev/staging/prod) at the network level.
9. Do document VPC architecture and IP schemas.
10. Do use security groups as stateful firewalls.
11. Do monitor load balancer error rates and latency.
12. Do set up DDoS protection on public-facing endpoints.
13. Do use VPC peering for cross-VPC communication.
14. Do enable VPC flow logs for security analysis.
15. Do enforce TLS 1.2+ for all traffic.

## 7. Don'ts ❌
1. Don't use public IP addresses for database instances.
2. Don't allow unrestricted outbound internet access (0.0.0.0/0) from private subnets.
3. Don't manually manage SSL certificates if avoidable.
4. Don't use self-signed certificates in production.
5. Don't share VPCs between production and development.
6. Don't open SSH/RDP ports to the public internet.
7. Don't ignore network latency metrics.
8. Don't use single points of failure in the network architecture.
9. Don't forget to configure DNS TTLs appropriately.
10. Don't bypass the WAF for sensitive APIs.
11. Don't hardcode IP addresses in configuration files.
12. Don't neglect network security group rules.
13. Don't allow direct database access from the frontend Next.js app.
14. Don't use default VPCs for production workloads.
15. Don't deploy changes to network routes without testing.

## 8. Quality Gates
- All network changes must be peer-reviewed.
- Penetration test required for public-facing network infrastructure.
- Zero open ports to the internet except 80/443.

## 9. Escalation Path
- Escalate network outages immediately to the Incident Response team.
- Escalate DNS configuration issues to the Domain Admin.

## 10. KPIs & Success Metrics
- 0 security breaches via network vectors.
- Sub-10ms internal network latency.
- 100% automated SSL renewal success rate.
