import { DataSource } from "typeorm";
import { getTypeOrmOptions } from "../../config/typeorm.options";
import { SampleWorkspace, SampleCandidate, Recruiter } from "../../entities";
import { workspacesData } from "../data/workspaces.seed";
import { candidatesData } from "../data/candidates.seed";
import { recruitersData } from "../data/recruiters.seed";

async function runSeeds() {
  console.log("🌱 Starting database seeding...");

  const databaseUrl =
    process.env.DATABASE_URL ||
    "postgres://pgUser:pgPass1@localhost:5432/assessment_db?schema=public";

  const dataSourceConfig = getTypeOrmOptions(databaseUrl);
  const dataSource = new DataSource(dataSourceConfig);

  try {
    await dataSource.initialize();
    console.log("📦 Database connection established");

    const workspaceRepo = dataSource.getRepository(SampleWorkspace);
    const candidateRepo = dataSource.getRepository(SampleCandidate);
    const recruiterRepo = dataSource.getRepository(Recruiter);

    console.log("🏢 Seeding workspaces...");
    const savedWorkspaces = [];
    for (const workspace of workspacesData) {
      const saved = await workspaceRepo.save(workspace);
      savedWorkspaces.push(saved);
      console.log(`  ✓ Created workspace: ${workspace.name} - ID: ${saved.id}`);
    }

    console.log("👥 Seeding candidates...");
    const candidateMapping = [
      {
        id: "1",
        name: "Alice Johnson",
        email: "alice.johnson@example.com",
        workspaceIndex: 0,
      },
      {
        id: "2",
        name: "Bob Chen",
        email: "bob.chen@example.com",
        workspaceIndex: 0,
      },
      {
        id: "3",
        name: "Carol Williams",
        email: "carol.williams@example.com",
        workspaceIndex: 1,
      },
      {
        id: "4",
        name: "David Rodriguez",
        email: "david.rodriguez@example.com",
        workspaceIndex: 1,
      },
      {
        id: "5",
        name: "Eva Martinez",
        email: "eva.martinez@example.com",
        workspaceIndex: 2,
      },
    ];

    for (const candidate of candidateMapping) {
      const candidateData = {
        id: candidate.id,
        fullName: candidate.name,
        email: candidate.email,
        workspaceId: savedWorkspaces[candidate.workspaceIndex].id,
      };
      const savedCandidate = await candidateRepo.save(candidateData);
      console.log(
        `  ✓ Created candidate: ${candidateData.fullName} (${candidateData.workspaceId})`,
      );
    }

    console.log("👔 Seeding recruiters...");
    const recruiterMapping = [
      { name: "John Doe", email: "john.doe@techcorp.com", workspaceIndex: 0 },
      {
        name: "Sarah Wilson",
        email: "sarah.wilson@techcorp.com",
        workspaceIndex: 0,
      },
      {
        name: "Mike Johnson",
        email: "mike.johnson@startupxyz.com",
        workspaceIndex: 1,
      },
      {
        name: "Emma Davis",
        email: "emma.davis@startupxyz.com",
        workspaceIndex: 1,
      },
      {
        name: "Alex Chen",
        email: "alex.chen@enterprise.com",
        workspaceIndex: 2,
      },
    ];

    for (const recruiter of recruiterMapping) {
      const recruiterData = {
        name: recruiter.name,
        email: recruiter.email,
        workspaceId: savedWorkspaces[recruiter.workspaceIndex].id,
      };
      const savedRecruiter = await recruiterRepo.save(recruiterData);
      console.log(
        `  ✓ Created recruiter: ${recruiterData.name} (${recruiterData.workspaceId}) - ID: ${savedRecruiter.id}`,
      );
    }

    console.log("✅ Database seeding completed successfully!");
    console.log(
      `📊 Created ${workspacesData.length} workspaces, ${candidateMapping.length} candidates, and ${recruiterMapping.length} recruiters`,
    );
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    process.exit(0);
  }
}

// Run the seeder
runSeeds().catch((error) => {
  console.error("❌ Failed to run seeds:", error);
  process.exit(1);
});
