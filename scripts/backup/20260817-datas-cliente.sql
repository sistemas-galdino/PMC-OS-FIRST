-- RETRATO das datas de entrada do PROD em 17/08/2026, antes de unificar o CRM
-- com o perfil do cliente.
--
-- Por que existe: até aqui o perfil do cliente gravava a data de entrada em
-- `cliente_informacoes_empresa.data_entrada` e o CRM lia
-- `clientes_entrada_new.data` — duas colunas para o mesmo fato. A partir da
-- unificação, a CS passa a escrever a data pelo drawer do CRM também. Este
-- arquivo é o registro de como as duas colunas estavam ANTES de a equipe
-- começar a editar pelo caminho novo.
--
-- O que ele restaura, e só isso:
--   · clientes_entrada_new.data
--   · cliente_informacoes_empresa.data_entrada
--   · cliente_informacoes_empresa.total_galdino
--
-- O que ele NÃO faz, de propósito: não apaga linhas de
-- cliente_informacoes_empresa criadas depois do retrato (elas podem ter
-- nome_negocio, site, análise de IA — dado que não é meu para descartar). Para
-- um cliente que não tinha linha em 17/08, o restore devolve `data_entrada` a
-- NULL em vez de remover a linha inteira.
--
-- Como ler os dados abaixo: 305 clientes, um por linha, na ordem do código do
-- cliente. `total_galdino` NULL significa que o cliente NÃO tinha linha em
-- cliente_informacoes_empresa no dia do retrato (a coluna é NOT NULL lá, com
-- padrão 4 — então NULL aqui só pode vir do LEFT JOIN).
--
-- Números do retrato (conferidos no PROD em 17/08/2026):
--   305 clientes | 145 sem `data` | 106 ativos sem `data`
--   153 linhas em cliente_informacoes_empresa, 148 com data_entrada
--   81 ativos que a unificação destrava (têm data_entrada, não têm `data`)
--   50 com as duas preenchidas e DIFERENTES (média 151 dias, máx. 459)
--   11 com data_entrada no futuro — provável erro de ano, conferir antes
--
-- Para conferir o estado atual contra este retrato, sem escrever nada:
--   scripts/backup/20260817-datas-cliente-conferencia.sql

BEGIN;

CREATE TEMP TABLE retrato_datas (
  id_cliente uuid PRIMARY KEY,
  codigo_cliente bigint,
  data date,
  data_entrada date,
  total_galdino integer
) ON COMMIT DROP;

INSERT INTO retrato_datas (id_cliente, codigo_cliente, data, data_entrada, total_galdino) VALUES
  ('1b8ed522-7d39-40be-a726-ce3e398d8893',100,'2025-03-10',NULL,NULL),
  ('a53184d8-03b0-49ea-b3ef-30e7bb9792fd',101,'2025-03-11',NULL,NULL),
  ('9517c935-1455-4ddc-8f01-9f0a3e925815',102,'2025-03-11',NULL,NULL),
  ('55c40ab6-0a7b-4430-a3ef-b47de0d1ae82',103,'2025-03-11',NULL,NULL),
  ('19a3b6d8-4cb2-4437-a79a-f789c350dacd',104,'2025-03-12',NULL,NULL),
  ('06da041e-96cd-4050-b628-fd73016fdf6c',105,'2025-03-13',NULL,NULL),
  ('7c3ec799-9d9a-40d5-94c2-ce681ad91d6c',106,'2025-03-14',NULL,NULL),
  ('be6a530f-87f8-4dd9-a342-449c921634c0',107,'2025-03-14',NULL,NULL),
  ('fbb403ad-54d1-4c8e-b9cb-6b6bbe07f81d',108,'2025-03-24','2025-03-24',4),
  ('338fbef8-c0e7-4670-ae26-e5dd4367f53c',109,'2025-03-25','2025-03-25',4),
  ('112d04b7-976f-4c8a-bb96-7c4bec399a62',110,'2025-04-07',NULL,NULL),
  ('d0e5fb77-482a-40ea-ad62-e461d14e23fd',111,'2025-04-07','2025-08-06',4),
  ('b7222896-dae8-4a87-ba90-fa23b58884ff',112,'2025-04-07',NULL,NULL),
  ('aae755e1-d40d-41ee-aa0d-22dc6cfd723a',113,'2025-04-08',NULL,NULL),
  ('8b9fa00e-0b6d-432e-a401-5ab91ebf7521',114,'2025-04-14',NULL,NULL),
  ('3d468c13-b854-4241-9aad-bda4cb05fffd',115,'2025-05-02',NULL,NULL),
  ('eed684ad-11e2-4c39-aec3-15a162ee224e',116,'2025-05-04','2025-05-04',4),
  ('4207e30c-1ea1-4e4c-bd6e-71f5fd88d202',117,'2025-05-05','2025-05-05',4),
  ('94fb8a5d-774a-4302-98c1-4352e964c599',118,'2025-05-27',NULL,NULL),
  ('7f769d31-5ce4-4e41-af5b-1b549186ec17',119,'2025-05-28',NULL,NULL),
  ('a021e4e7-730c-4e04-aaef-fc7de0fade5a',120,'2025-06-02',NULL,NULL),
  ('af70e472-39e9-4133-987f-72fd6a360c5f',121,'2025-06-03',NULL,NULL),
  ('2f6681c6-7c83-40e4-842d-d167a1eadcfb',122,'2025-06-03',NULL,NULL),
  ('13ec4821-e98f-4e8c-b5a5-968d0bf0d5db',123,'2025-06-04',NULL,NULL),
  ('369d36d7-9a01-4b1b-bc43-7304bb0d40a0',124,'2025-06-04',NULL,NULL),
  ('225d638c-c63c-4f8f-ba71-2cc9bddc06ff',125,'2025-06-04',NULL,NULL),
  ('8c987d7f-6d17-417d-b5d3-c8b8ca7023de',126,'2025-06-24',NULL,NULL),
  ('64aa42de-ddd7-41e7-8f9e-e23984addba1',127,'2025-07-02','2025-07-02',4),
  ('5f1f6cda-72b7-4b12-b884-61b1388926bd',128,'2025-07-02',NULL,NULL),
  ('b8e9a3d1-2d77-4868-9152-e93a4883b089',129,'2025-07-05',NULL,NULL),
  ('f8d130a6-ef9b-41fd-be9e-f39232f032f5',130,'2025-07-06','2026-04-29',4),
  ('16a63567-1955-42c2-ac60-2d03dca4ed54',131,'2025-09-01',NULL,NULL),
  ('5f7638f2-a2c1-4ff3-bd74-88631adcbc4e',132,'2025-07-07',NULL,NULL),
  ('cab63783-2248-49da-8258-3a3d4a3f01fa',133,'2025-07-07',NULL,NULL),
  ('05d1e51d-089c-4b2d-8768-c4395e984785',134,'2025-07-07',NULL,NULL),
  ('616a82ee-fca7-49b7-bce6-6c55d961d69c',135,'2025-07-07',NULL,NULL),
  ('0fd060a9-7fde-4cd7-99cb-b999078d38ba',136,'2025-07-07',NULL,NULL),
  ('22375d1d-1336-496f-8387-195738ab6bfe',137,'2025-07-08',NULL,NULL),
  ('ad31c8a7-5be0-4168-bab9-1298c722bdbf',138,'2025-09-01',NULL,NULL),
  ('2b6bac6f-eeeb-4799-93c1-c19d0c6f618a',139,'2025-09-01',NULL,NULL),
  ('c3d6a086-e4aa-44fd-b6df-d912a38cc745',140,'2025-09-01',NULL,NULL),
  ('09f4d7e4-5b41-4183-84dc-bb93acc1b60f',141,'2025-09-01',NULL,NULL),
  ('8eea3dc3-525d-43ef-a7b4-02f87e1ad688',142,'2025-09-01',NULL,NULL),
  ('bbfcd728-96d8-4974-bbcf-5fb061e5e2dd',143,'2025-09-01',NULL,NULL),
  ('8e0e4708-1b32-434a-9a79-d158e831fffe',144,'2025-09-01',NULL,NULL),
  ('90771460-4b6f-4bc3-bcf6-449678908a85',145,'2025-07-25','2025-07-25',4),
  ('c826c3ef-c0cb-4a87-949e-84e88e940071',146,'2025-07-28',NULL,NULL),
  ('3a412e5c-3b37-496c-9a07-1fa672df0e83',147,'2025-07-01',NULL,NULL),
  ('182eb84a-70be-4c4b-813e-b57ee5609ca0',148,'2025-07-01',NULL,NULL),
  ('dfb7f004-e790-49c8-9a0c-6201b50b0dbc',149,'2025-09-01',NULL,NULL),
  ('e699cf84-4164-4013-a9ee-d97181ea1ba3',150,'2025-09-01','2025-08-12',4),
  ('756343bb-f3f2-405d-adf2-10de757433b5',151,'2025-09-01','2025-08-18',4),
  ('d0400681-19d5-4cf8-a682-05652dc5d07e',152,'2025-09-01','2026-03-18',4),
  ('42ccbe2b-6235-4b7a-a522-9bd7d75895ff',153,'2025-09-01',NULL,NULL),
  ('84ccfce6-9a70-4978-8204-dd9623178472',154,'2025-09-01','2025-08-28',4),
  ('3f880c35-e4c1-4fb1-bbbf-1cf21c61db97',155,'2025-09-01','2025-09-01',4),
  ('3cc646ad-7328-457d-b7a0-24601a63e756',156,'2026-01-01',NULL,NULL),
  ('44cc4bd8-4e74-45a9-8eef-099c09fea9e3',157,'2025-09-01',NULL,NULL),
  ('11cda5d3-d8db-4914-b8c9-1f4d5b344735',158,'2025-09-01',NULL,NULL),
  ('8ca1c94e-351d-452c-a999-ac881f487d17',159,'2025-09-01',NULL,NULL),
  ('521d648b-d86c-4e41-91ea-9b3e06b6d411',160,'2025-09-01',NULL,NULL),
  ('c1b342cf-d28c-4f5f-93c5-41024b6130ef',161,'2025-09-01',NULL,NULL),
  ('2094f676-30ad-4f3d-a5d4-be2c593998bb',162,'2025-09-01',NULL,NULL),
  ('190b0ccd-7e2a-46f2-bf87-776ccf750220',163,'2025-09-01','2025-08-21',4),
  ('962bd536-0b25-4564-a348-0b1d4668da59',164,'2025-09-01','2025-09-02',4),
  ('0ced9254-7536-4ce2-a339-8fca947ca347',165,'2025-09-01',NULL,NULL),
  ('809a64f7-4656-4d94-b4d7-73785da8f50f',166,'2025-09-01','2025-08-28',4),
  ('2a6e28a7-968a-4c17-928c-0fb422f25e4f',167,'2025-09-01','2025-08-29',4),
  ('d4c17641-fd52-486f-8c9a-dea5a701a9ad',168,'2025-09-01','2025-08-28',4),
  ('d3afe34b-1483-4d13-8c2a-eb862f58e2f9',169,'2025-09-01','2025-08-28',4),
  ('ba96fcd8-ab7c-463d-9f36-24253ea41594',170,'2025-09-01','2025-09-01',4),
  ('3934e091-a18c-4045-b688-9b683ebf677c',171,'2025-09-01','2025-09-04',4),
  ('1ffa19d0-b677-4520-8618-1789e1de5d2f',172,'2025-09-01',NULL,NULL),
  ('eacec47e-02dc-4917-aebb-6106b7746154',173,'2025-09-01',NULL,NULL),
  ('eb05e723-39eb-4ba2-84f5-428515ab574c',174,'2025-09-01',NULL,NULL),
  ('b44444eb-a8d6-4a14-af34-30b79434a906',175,'2025-09-01',NULL,NULL),
  ('cbd4c466-4f5b-4ef6-ad63-3ab52f046994',177,'2025-09-01','2025-09-02',4),
  ('55a2c8f1-b526-4044-b1c3-c4244bee6cfa',178,'2025-09-01',NULL,NULL),
  ('fc59e4be-da0d-4a25-ab99-0dcfb5a110a8',179,'2025-09-01','2025-09-03',4),
  ('5bb0d4cd-b554-4948-84a6-6bfd433fb769',180,'2025-09-01',NULL,NULL),
  ('624ea368-d28b-460c-8bdb-bde65d12dca6',181,'2025-09-01','2026-09-09',4),
  ('d5530e9f-e5ea-4c62-968e-4dbb731bc716',182,'2025-09-01','2025-09-01',4),
  ('ff35b904-5e65-4e1b-9377-7f2f58418464',183,'2025-09-01',NULL,NULL),
  ('c8ce1a68-d153-4925-9254-44c502dc2058',184,'2025-09-01','2026-09-20',4),
  ('f0ca9d69-61dd-4266-84dd-1d8b09615322',185,'2025-09-01','2025-09-09',4),
  ('b4ac5fc1-a364-4597-9872-771f2d4c26ae',186,'2025-09-01',NULL,NULL),
  ('3802fb90-bfda-44ba-86c5-60dbf20938e4',187,'2025-09-01',NULL,NULL),
  ('dde2530e-6f8b-4fb1-b6dd-77822011ddec',188,'2025-09-01',NULL,NULL),
  ('37619da9-fe5d-466b-ad9d-f1ba3e22efdb',189,'2025-09-01',NULL,NULL),
  ('566efd8f-b29f-416f-a429-259e7c25e016',190,'2025-09-01',NULL,NULL),
  ('9216671a-812d-47bb-b960-d2ecd96addc7',191,'2025-09-01',NULL,NULL),
  ('6478c1b2-046f-47f9-bb25-175e6e7b92f7',192,'2025-09-01',NULL,NULL),
  ('4e9e367a-789b-4a82-9024-af4d2bd39b20',193,'2025-09-01',NULL,NULL),
  ('24691ec9-37f7-4f7a-8f08-983e31c0573c',194,'2025-09-01',NULL,NULL),
  ('8214c616-af26-4958-94cf-08c5f8a54dc8',195,'2025-09-01','2026-10-08',4),
  ('7599fd7f-fbd7-4731-af5f-915554cb04a3',196,'2025-09-01',NULL,NULL),
  ('22c915c3-7abd-4b0c-86c6-29eb4df05800',197,'2025-09-01','2026-10-08',4),
  ('dd00a84e-8647-41f5-b209-04b8a8cc8e6c',198,'2025-09-01','2026-10-02',4),
  ('e65dff36-c1b8-494a-9e05-9d3eac1d7597',199,'2025-09-01',NULL,NULL),
  ('c341ef60-1c48-400e-aaf7-d0ea6e5c5eb3',200,'2025-09-01',NULL,NULL),
  ('247afa5e-3ebf-4896-ba81-c77b3bd83bda',201,'2025-09-01','2026-10-17',4),
  ('7b1e7e28-5d3d-4e09-91ad-0da1c67c92ef',202,'2025-10-01','2026-10-21',4),
  ('c4d7ba59-4416-44c6-b610-53e909438196',203,'2025-10-01',NULL,NULL),
  ('df8ec445-e8f4-4907-8c9e-14e7cbcf348c',204,'2025-09-01','2025-10-20',4),
  ('73d34ae1-a648-4944-872d-0f8c0cfe1703',205,'2025-09-01',NULL,NULL),
  ('d95836fa-a5d7-463c-b598-8d3aa8a5dd85',206,'2025-09-01','2026-10-20',4),
  ('a508d1e0-93f7-4a48-845e-da143d9cdf76',207,'2025-09-01','2025-10-10',4),
  ('17fb9b30-847b-4436-84d3-05b32476acf1',208,'2025-10-01','2026-10-29',4),
  ('9258dc1a-4995-4e7e-9927-7dc5f826c081',209,'2025-09-01',NULL,NULL),
  ('3c718062-0eb7-486e-84dc-a8058fbacc35',210,'2025-09-01',NULL,NULL),
  ('5c3515d8-1209-4d7a-8f4d-65aa01a2d0fc',211,'2025-10-01',NULL,NULL),
  ('c85d5533-e86c-49a3-8ce2-ae21e679a5f4',212,'2025-09-01','2025-11-11',4),
  ('e8fc4b9f-bac4-45e1-b5a1-c4f398b47cbb',213,'2025-10-01','2025-11-04',4),
  ('9cf23a6b-1b0f-4448-bb1f-36eeeeea815e',214,'2025-09-01',NULL,NULL),
  ('d5b9a784-bec9-4197-83dc-c13b4f2300b7',215,'2025-09-01',NULL,NULL),
  ('41f644d6-69e2-418c-8fba-5cb891c276ca',216,'2025-09-01',NULL,NULL),
  ('66a76319-55cf-4951-94f9-ed318a1dfdd1',217,'2025-09-01',NULL,NULL),
  ('26e0e2da-2cef-4239-8bc1-b689fdb5636f',218,'2025-09-01',NULL,NULL),
  ('ec48e68f-e195-47af-8326-82cda4fc3668',219,'2025-09-01',NULL,NULL),
  ('62011aed-3637-472d-9bcf-febf295fa63f',220,'2025-09-01','2026-12-04',4),
  ('63b23a44-7464-441a-aa9a-9137606dfe8f',221,'2025-09-01','2025-12-10',4),
  ('b7c25f21-69b8-4da7-9665-c1d215fc87a1',222,'2025-09-01','2026-12-01',4),
  ('1e09311f-a6ad-4dfd-ab17-468a836f5a32',223,'2025-09-01',NULL,NULL),
  ('39803c96-69dd-409c-8281-39d373ae4d57',224,'2025-09-01','2025-12-03',4),
  ('9b604f31-8d87-4d73-b1c4-560936422773',225,'2025-09-01',NULL,NULL),
  ('1a9dfe3a-9a8a-473a-a122-34dd204c969b',226,'2025-12-03',NULL,NULL),
  ('b0268b12-3f9f-4772-8e33-74bdc15f2ef3',227,'2025-09-01',NULL,NULL),
  ('2dbab956-acc2-4dfd-9dd7-afc1b2107074',228,'2025-09-01',NULL,NULL),
  ('bc76417d-b7f9-400b-8c9e-e9029c5b88bf',229,'2025-09-01',NULL,NULL),
  ('d70aa926-4e1d-48b0-ae7b-624ed20e07ed',230,'2025-09-01',NULL,NULL),
  ('7590f977-9b3f-459e-9bc6-6736787ba8fc',231,'2025-09-01','2026-01-21',4),
  ('4701f58a-fe07-4dce-9105-77ebfefba04e',232,'2025-09-01',NULL,NULL),
  ('8b403f31-7869-456c-b13c-c056bbf056b7',233,'2025-09-01',NULL,NULL),
  ('88d65f00-7b77-4d3b-9fa0-f726a6f11003',234,'2025-09-01','2025-09-01',4),
  ('c5480309-cd44-4b7f-9b0e-ccd7e0b1639a',235,'2025-10-01',NULL,NULL),
  ('46c14872-c3d8-4a74-83ef-4e7e8ed5d3e2',236,'2025-09-01','2026-02-02',4),
  ('1942f1ed-523d-4ddf-a5bc-85e03f6b8e8f',237,'2025-09-01','2026-01-13',4),
  ('5eb387ec-48c6-4d9e-9a3e-a1d863d615e7',238,'2025-09-01','2025-10-11',4),
  ('c17d5a93-e941-418b-aeec-a81dfab18f94',239,'2026-01-01','2026-01-30',4),
  ('1606c1ca-4c3b-4442-9c23-c470dff86ba2',240,'2026-01-01',NULL,NULL),
  ('5b6adaa0-af8d-4be3-91af-e8362334b2da',241,'2025-09-01',NULL,NULL),
  ('a8182b20-463d-4f2d-81ba-8465600f441d',242,'2026-01-01','2026-03-09',4),
  ('ee5ede9f-7b2d-41be-8730-e4c5ae4febf1',243,'2025-09-01','2026-03-13',4),
  ('8cdba29e-bf87-48e9-af86-47d4357bc04d',244,'2026-01-01',NULL,NULL),
  ('574be90e-84b4-4cb2-a714-b09f50c6a682',245,'2026-01-01','2026-02-24',4),
  ('2cf8307b-d950-4957-b1ef-2ddd69fd7662',246,'2026-01-01','2026-02-02',4),
  ('51635897-22da-4664-9ebc-9eb05a76ba5e',247,'2026-01-01','2026-02-12',4),
  ('33dc0201-1a55-4ba3-823d-b3da94842dd9',248,'2026-01-01','2026-02-04',4),
  ('f272f779-b53a-44ae-ad2d-887e6d535b6d',249,'2026-01-01',NULL,NULL),
  ('6e50bd23-7f0c-4cdf-abb2-68101ceedeac',250,'2026-01-01','2026-02-20',4),
  ('4d3460ea-0a75-4f0a-8702-48025a5dbe31',251,'2026-02-04','2026-02-04',4),
  ('0d19cdae-3721-4845-8b14-ec9811b5e175',252,'2026-01-01',NULL,NULL),
  ('cf880a6a-5d80-43bc-9355-9ceadfa46bb0',253,'2026-01-01',NULL,NULL),
  ('623969c2-e282-4f4e-bfc4-bd85495e400d',254,'2025-09-01','2026-03-07',4),
  ('01462e64-20c6-4e50-9b0c-f29d45cee4a3',255,'2025-09-01','2026-03-16',4),
  ('dfce6443-0734-4ee7-9d9d-bb298eb85cde',256,'2025-09-01',NULL,NULL),
  ('34343870-de68-4375-9a9d-8b8514f40536',257,'2025-01-01','2026-01-02',4),
  ('31668762-1485-4561-8543-b3e6165efbfc',258,'2025-09-01','2026-02-24',4),
  ('3e4623f8-b5c1-4d3d-a73c-e999c4b99ff5',259,'2026-02-26','2026-02-26',4),
  ('40b88cfe-7656-4414-89b0-4c184e64f538',260,NULL,NULL,NULL),
  ('01e7b060-6f13-4793-8ba6-5068d34919c9',261,NULL,'2026-03-12',4),
  ('c6ace323-9f7f-4e4f-94b9-56d795d8b23f',262,NULL,NULL,NULL),
  ('b6fd3e7e-2691-4dfc-8f66-4df11985cc6b',263,NULL,NULL,NULL),
  ('a83c10bf-4b51-41d0-91a5-27ff00f7375f',266,NULL,NULL,NULL),
  ('eb53117c-560f-496a-9c90-60d276063160',267,NULL,NULL,NULL),
  ('cc848f30-e496-455d-85ea-bf64cdba8205',268,NULL,NULL,NULL),
  ('bc3e6b99-d394-4b6f-b74c-59ea4109e2ca',269,NULL,NULL,NULL),
  ('73728e69-1fcb-4261-9e6d-c7b326a65b4d',270,NULL,'2026-03-13',4),
  ('9d40194b-cf4e-46e2-a6ca-2c337f54d606',271,NULL,'2026-03-13',4),
  ('7c3486cd-1506-443a-8e57-ae14a8f2003c',272,NULL,NULL,NULL),
  ('fc643847-d4aa-4aeb-9bea-294426b72fb2',273,NULL,'2026-04-02',4),
  ('91408505-5b53-4a37-bf08-db262b2cb2b3',275,NULL,NULL,NULL),
  ('b246550d-b627-4454-9009-d4555151c53e',276,NULL,NULL,NULL),
  ('c86142b9-afd4-4acf-936a-385616b03ef3',277,NULL,'2026-03-25',4),
  ('b8fa1924-3564-485b-a6f3-d5d7232a4181',279,NULL,NULL,NULL),
  ('9e03d177-fdb4-43e4-8936-5de86f4d91b6',280,NULL,NULL,NULL),
  ('a0f32f44-249f-491e-b4ca-85a2e690933d',281,NULL,NULL,NULL),
  ('78645d74-ebb2-4916-b814-87186a5a49e9',282,NULL,NULL,NULL),
  ('f906e9dd-84de-496f-905d-bfc9197b127e',283,NULL,NULL,NULL),
  ('c17a8b11-a272-4e87-8b1d-cdd364e9bed7',284,NULL,NULL,NULL),
  ('951a268b-40e8-4a73-9fba-8158cade660b',285,NULL,NULL,NULL),
  ('f0741eaf-8360-4119-91d2-39e0fc6dcd98',286,NULL,NULL,NULL),
  ('d3074d3f-6db3-4497-aa17-91450d60c57d',287,NULL,NULL,NULL),
  ('6c6e59f4-33d6-42cb-8bfe-ed0d4a97cf6f',288,NULL,NULL,NULL),
  ('c04975a6-b70e-4ccb-b47b-97da22cbad04',290,NULL,'2026-04-24',4),
  ('c7bc0845-3eb9-4f1b-811b-1e15b72a34ac',291,NULL,NULL,NULL),
  ('5bb0170c-e5fc-4aaa-a044-152d071b232e',292,NULL,NULL,NULL),
  ('92657a81-3251-440f-9c40-50c29b4187ae',293,NULL,'2026-04-07',4),
  ('b7ece40f-6e5c-41ed-a294-5fa22c01e38e',295,NULL,'2026-05-04',4),
  ('f6237b2c-a85c-47d4-b1fc-3c7e596ade7c',296,NULL,NULL,NULL),
  ('1e435400-6eb9-4d38-a998-0ffc32d128c7',297,NULL,'2026-04-07',4),
  ('d825a71f-094a-468b-b3e4-a391718a65c4',300,NULL,'2026-04-06',4),
  ('db3bd676-c096-40f8-86c4-506b8a234022',301,NULL,'2026-04-09',4),
  ('6d3a9c81-729f-4bb7-a57f-7740e03669e8',302,NULL,'2026-04-09',4),
  ('640658f3-c343-4482-97d9-2b087f3fb0b6',303,NULL,'2026-04-24',4),
  ('1ebcb505-fbc3-430b-b14a-ae11cf22a529',304,NULL,NULL,NULL),
  ('40dc921d-92ba-48a4-95bf-9eaae75781fb',305,NULL,NULL,NULL),
  ('f0afed7e-43e7-4f15-beb6-dc0920b9b03a',306,NULL,'2026-03-31',4),
  ('ce865640-80d0-472f-bb77-df61450cee6a',307,NULL,'2026-03-30',4),
  ('b71ff65c-8d6e-452f-b094-49aa6b8564bb',308,NULL,'2026-04-06',4),
  ('4acf8012-cfac-4a04-ba4b-465218f1e5ef',309,NULL,'2026-04-07',4),
  ('3c8ed658-14c4-411c-a893-110e628f00bf',310,NULL,'2026-04-13',4),
  ('752415cf-6c38-4d93-b66d-71d4854efa30',311,NULL,'2026-04-10',4),
  ('e0f9d787-40c8-4d4d-a5eb-13662e7709dc',312,NULL,'2026-04-06',4),
  ('376a04cd-9b75-4bb6-9670-0d2b822ab0ff',313,NULL,'2026-04-06',4),
  ('d76d33e0-3aec-41b1-9f41-d34feeacffbd',314,NULL,'2026-04-09',4),
  ('3557444d-8deb-4b34-a02d-4c10f6a3986e',316,'2026-01-13','2026-04-30',4),
  ('8f50395b-2a91-4135-ba9e-76d8aba4822e',318,NULL,'2026-04-16',4),
  ('37359d70-70b8-455a-a851-8e2ab555fc1a',321,NULL,'2026-04-16',4),
  ('70597579-74bf-4f06-aa76-05229bad47f8',324,NULL,'2026-04-17',4),
  ('0077d8bd-d28a-4ca5-a768-9a575346e178',325,NULL,'2026-04-20',4),
  ('ebf6a1ff-be1c-4175-804a-45971d574df8',328,NULL,'2026-04-22',4),
  ('6fce73d6-d9ce-433a-a89f-6f10d9793a5b',329,NULL,'2026-04-23',4),
  ('7e516a56-af08-4eff-a45c-916363d2ec49',330,NULL,'2026-04-24',4),
  ('74efca19-b924-484a-8192-44b0a3001c4d',331,NULL,'2026-03-20',4),
  ('36ffecdf-200a-414a-81c4-9dc23c102ddb',332,NULL,'2026-04-23',4),
  ('6998bded-24bc-464f-9e2c-20d3327c737b',333,NULL,NULL,4),
  ('60f2b245-dc59-4636-a293-583a12ef1583',334,NULL,'2026-04-29',4),
  ('25b12eac-9097-4c15-8d5e-b00a5415f4a0',335,NULL,'2026-03-05',4),
  ('ae67c029-654c-4e5c-be9b-49144cbf1d5f',336,NULL,'2026-05-01',4),
  ('1310ed40-e661-4072-bc3d-5de5b176a7fa',337,NULL,'2026-04-30',4),
  ('f29c85c8-21c1-4ac5-a56c-f79eda32fd26',338,NULL,'2026-05-07',4),
  ('8a131f29-945b-4127-b484-36df2f93a3b0',339,NULL,NULL,NULL),
  ('41cc2cd8-4f76-4221-a074-e242988ad139',340,NULL,NULL,NULL),
  ('d0632df5-1e64-4660-86c1-9feb227b32a0',341,NULL,NULL,NULL),
  ('6a95b423-d8de-4eb7-9523-89fb40e43d8a',342,NULL,'2026-05-11',4),
  ('3b9c45ab-8ede-45dc-a299-dba736e9160b',343,NULL,NULL,NULL),
  ('67e3c856-cd6e-4d08-874f-fbbf7204c4e7',344,NULL,NULL,NULL),
  ('75dc5743-0418-4f3f-9eb7-7eb9babcfad9',345,NULL,'2026-05-12',4),
  ('4c439f8b-96a8-40a5-953f-a2b59fa29714',346,NULL,'2026-05-12',4),
  ('d790594d-f2b9-4784-88b1-1839f183f81a',347,NULL,'2026-05-13',4),
  ('a29efe76-9c60-46c0-b6b9-2491e4215030',348,NULL,'2026-05-13',4),
  ('ad38ec06-9518-4824-95f3-36ce18c4a784',349,NULL,'2026-05-14',4),
  ('7ff2492f-b03d-4bde-a27b-89fc916cc858',350,NULL,'2026-05-14',4),
  ('46c1b8aa-ef35-4df9-b2f5-68fc625f5017',351,NULL,'2026-05-20',4),
  ('511e8296-0bea-4bed-9edf-4143afacf16a',352,NULL,'2026-05-15',4),
  ('9211cc26-470a-46fa-9d36-fb234d6d7098',353,NULL,'2026-05-20',4),
  ('70f32c0a-4dec-4aed-9094-50f627f00f42',354,NULL,NULL,NULL),
  ('26a0e16a-126e-4883-82c2-cb9848d73e7e',355,NULL,'2026-05-27',4),
  ('fb7a1d27-bd0a-4efc-bf7f-9689b1cde304',356,NULL,'2026-05-20',4),
  ('45c8881f-e393-47c0-be5a-240ab8c38e1d',357,NULL,NULL,NULL),
  ('1b0c7a3f-4cd2-4a30-a730-14a1ce87db4e',358,NULL,'2026-05-20',4),
  ('07113a50-5067-47be-8f9c-ae0ebb9b1a26',359,NULL,'2026-04-21',4),
  ('95dce634-ff96-4ab0-a436-cf055cead427',360,NULL,NULL,NULL),
  ('01f76d37-5b37-4b18-8241-9a73ae66ac69',361,NULL,'2026-05-26',4),
  ('5781f4b9-dde6-4409-8cc9-c4e230c0335a',362,NULL,'2026-05-27',4),
  ('f9827a61-a893-41ef-985d-61826dc0c660',363,NULL,NULL,NULL),
  ('478f7517-0e05-4e55-9517-5aac04d9b93e',364,NULL,'2026-05-21',4),
  ('b495158c-cc80-4693-8ab0-812d85a47b74',365,NULL,'2026-05-25',4),
  ('4ceb1aa3-c2d9-4f25-bef1-a503b49daaf9',366,NULL,'2026-05-25',4),
  ('5dc7e638-73b2-48f7-a17f-49d4426b29e8',367,NULL,'2026-06-23',4),
  ('842a8309-6bda-4c95-8222-b7d619c8a599',368,NULL,'2026-04-27',4),
  ('e83dd01f-7ee1-4848-88a2-bb1756159a86',369,NULL,'2026-05-20',4),
  ('7ce71e71-bc97-4ba7-9b8b-facd8fc94ea2',370,NULL,NULL,NULL),
  ('58e905b3-c16d-4c69-b47a-f18e0e5dad0a',371,NULL,'2026-06-23',4),
  ('6931a252-f5aa-4c68-b45e-f727b96e0699',372,NULL,'2026-06-08',4),
  ('9556a078-a888-4454-972d-ac2ebfc1a60c',373,NULL,'2026-06-17',4),
  ('a154aa58-62bb-4df4-ba2a-f4c19c446591',374,NULL,'2026-06-19',4),
  ('c9a48a16-f174-4c62-ae05-fa83439d9441',375,NULL,'2026-06-15',4),
  ('fbeec786-7b21-4d88-a68c-c602b74f9222',376,NULL,'2026-06-22',4),
  ('8c492c99-4850-4076-852f-11058f7a62f2',377,NULL,'2026-06-12',4),
  ('07bf4738-977f-48b1-b762-6a74b6b10a5c',378,NULL,'2026-06-10',4),
  ('51b4021e-a7b0-44d4-87c4-b49d55949a62',379,NULL,'2026-06-25',4),
  ('e8635f39-cb0b-4122-8845-15c80aa0915d',380,NULL,'2026-06-20',4),
  ('fe171ed6-c6d9-493c-ae70-35f935275412',382,NULL,'2026-06-11',4),
  ('68296e62-1c54-465d-9a70-821e3019ead3',383,NULL,NULL,NULL),
  ('bc84b3e8-9589-4159-a7dd-7478a76e0a7d',384,NULL,'2026-05-14',4),
  ('2f38ce8c-b98d-4625-bc44-b4f48437e176',385,NULL,'2026-06-29',4),
  ('0e7bdb2a-2c3b-487f-9923-ad2902ad4b0b',386,NULL,'2026-06-17',4),
  ('2b0834e1-3740-4211-8c37-3058bfb83a37',387,NULL,'2026-06-30',4),
  ('12e80c7a-f154-4351-8998-41a40f91a2e0',388,NULL,'2026-06-24',4),
  ('485e5234-d8cb-4451-a1cb-06cd5d7b2726',389,NULL,'2026-07-01',4),
  ('5d7ae5c7-6a8a-4031-8301-f022820b300b',390,NULL,'2026-07-08',4),
  ('49a56e24-6103-4ed5-97ef-0f9ea588f5c1',391,NULL,NULL,4),
  ('452d9bd6-468b-4943-bd05-6c6c3f591f3c',392,NULL,'2026-06-23',4),
  ('db46e101-ea12-4ff9-9b15-88a5fbfd42cd',393,NULL,NULL,NULL),
  ('0b4d80d2-80a3-4bd7-a858-5e2f71b9437c',394,NULL,'2026-07-06',4),
  ('b1d80fa0-ad0d-48fa-b9d0-db6219091817',395,NULL,'2026-07-07',4),
  ('34b97dd9-f866-4dd0-bfba-7bedf58b52bc',396,NULL,'2026-07-20',4),
  ('06b8f9c4-52fd-48ca-8c1e-e914866916e5',397,NULL,NULL,NULL),
  ('5162ba81-c7a0-491d-a7d4-cb5f785ac65b',398,NULL,'2026-08-01',4),
  ('37ad43ce-f6ec-44c7-a350-46fef15f8bd0',399,NULL,NULL,NULL),
  ('c4e7dbdf-47d0-49f6-a5b9-c79771d1bef7',400,NULL,NULL,NULL),
  ('f51c572e-b5da-4af0-8930-c975a3ebe7ab',402,NULL,'2026-07-08',4),
  ('16d57a7b-1994-4a11-a5b0-3367c6535cac',403,NULL,NULL,NULL),
  ('46e688df-e318-4f62-8460-ae6897f723f5',404,NULL,'2026-07-23',4),
  ('ef21948b-1d7a-49a9-9b97-a73490eb4d7f',405,NULL,NULL,NULL),
  ('b658239d-0859-4ac2-900e-1f9946643e29',407,NULL,NULL,NULL),
  ('b713be31-551d-4944-a0b1-62e99b86345b',408,NULL,'2026-07-27',4),
  ('95dfb454-9eaf-434a-9e75-5ce4d26541e8',409,NULL,NULL,NULL),
  ('d0b76d48-bddc-4bbc-80a8-44af22732478',410,NULL,NULL,NULL),
  ('73c7e302-0fab-47b2-a8ca-0ebf1d3a3d67',411,NULL,NULL,4),
  ('0b3dc1c3-36f3-48cb-adf0-8935d55ede61',412,NULL,NULL,NULL),
  ('d2e0b1ea-f39c-4836-a784-850b027a5f85',413,NULL,NULL,NULL),
  ('1c53fcf4-1ca4-4290-8be6-f510db5af11f',414,NULL,'2026-08-09',4),
  ('2af2b313-3637-4293-b732-0959daae6dc6',415,NULL,NULL,NULL),
  ('c8dfa166-c79e-491c-bd93-4ad7c092648c',416,NULL,NULL,NULL),
  ('28b2c4c4-eabc-4ae7-87d6-e0132b8b90e1',418,NULL,NULL,NULL),
  ('bbb098ac-7750-4d37-a092-527a84174129',419,NULL,'2026-08-03',4),
  ('186379cc-8ebf-46f4-996c-9480c6e59ba1',420,NULL,NULL,4),
  ('099d8f76-f2e4-4f85-a733-5ae4225ddc2c',421,NULL,NULL,NULL),
  ('cd5dc021-ad6c-46a1-ac38-2489e9fc428b',422,NULL,NULL,4),
  ('577f7965-339f-4f8c-a4bb-7ee5cf8e2e14',423,NULL,NULL,NULL),
  ('c3dbacfe-b5e6-4c85-b551-a4f4f3b09805',424,NULL,NULL,NULL),
  ('0bf63a3a-3ba1-4f6f-a990-a267f5986980',425,NULL,NULL,NULL);

-- Trava: se o retrato não tiver 305 linhas, alguma coisa se perdeu na
-- transcrição e restaurar seria pior que não restaurar.
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM retrato_datas;
  IF n <> 305 THEN
    RAISE EXCEPTION 'Retrato incompleto: % linhas, esperado 305', n;
  END IF;
END $$;

-- 1) Data do cadastro legado.
UPDATE public.clientes_entrada_new c
   SET data = r.data
  FROM retrato_datas r
 WHERE r.id_cliente = c.id_cliente
   AND c.data IS DISTINCT FROM r.data;

-- 2) Data de entrada e cadência, para quem já tinha linha no dia do retrato.
UPDATE public.cliente_informacoes_empresa i
   SET data_entrada = r.data_entrada,
       total_galdino = r.total_galdino
  FROM retrato_datas r
 WHERE r.id_cliente = i.id_cliente
   AND r.total_galdino IS NOT NULL
   AND (i.data_entrada IS DISTINCT FROM r.data_entrada
        OR i.total_galdino IS DISTINCT FROM r.total_galdino);

-- 3) Quem NÃO tinha linha em 17/08: a data de entrada volta a ser desconhecida.
--    A linha em si fica, porque pode ter ganhado outros campos desde então.
UPDATE public.cliente_informacoes_empresa i
   SET data_entrada = NULL
  FROM retrato_datas r
 WHERE r.id_cliente = i.id_cliente
   AND r.total_galdino IS NULL
   AND i.data_entrada IS NOT NULL;

-- Confere antes do COMMIT. Esperado: 145 / 148 / 0.
SELECT
  (SELECT count(*) FROM public.clientes_entrada_new WHERE data IS NULL)            AS sem_data_legado,
  (SELECT count(*) FROM public.cliente_informacoes_empresa
    WHERE data_entrada IS NOT NULL)                                               AS com_data_entrada,
  (SELECT count(*) FROM retrato_datas r
     JOIN public.clientes_entrada_new c USING (id_cliente)
    WHERE c.data IS DISTINCT FROM r.data)                                         AS ainda_divergentes;

COMMIT;
