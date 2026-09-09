using Microsoft.AspNetCore.StaticFiles;
using NeonApexRacing.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();

// Register our ADO.NET leaderboard service.
builder.Services.AddScoped<ILeaderboardService, LeaderboardService>();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Game/Index");
    app.UseHsts();
}

app.UseHttpsRedirection();
var contentTypeProvider = new FileExtensionContentTypeProvider();

contentTypeProvider.Mappings[".glb"] = "model/gltf-binary";

app.UseStaticFiles(new StaticFileOptions
{
    ContentTypeProvider = contentTypeProvider
});

app.UseRouting();

app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Game}/{action=Index}/{id?}");

app.Run();